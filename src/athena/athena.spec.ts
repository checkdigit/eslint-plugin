// athena/athena.spec.ts

import createTester from '../ts-tester.test';
import rule, { ruleId } from './athena';
// file.only
createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'non-sql',
      code: `\`bar\``,
    },
    {
      name: 'not SELECT nor WITH sql',
      code: `\`drop table foo\``,
    },
    {
      name: 'SELECT without FROM',
      code: `\`select 1\``,
    },
    {
      name: 'SELECT with FROM',
      code: `\`select * from link\``,
    },
    {
      name: 'SELECT with FROM - table name with single quotes',
      code: `\`select * from 'link'\``,
    },
    {
      name: 'SELECT with FROM - table name with double quotes',
      code: `\`select * from "link"\``,
    },
    {
      name: 'table name alias',
      code: `\`select m.url from link as m\``,
    },
    {
      name: 'using WITH',
      code: `\`WITH m AS (select * from link) select requestbody from m\``,
    },
    {
      name: 'parse function expression with array access - in column',
      code: `\`WITH m AS (select * from link) 
        select DISTINCT split(url, '/') [5] as linkId FROM m\``,
    },
    {
      name: 'parse JSON property access - in column',
      code: `\`select posting['amount']\``,
      skip: true,
    },
    {
      name: 'parse function expression with array access - in condition',
      code: `\`SELECT * FROM person WHERE split(url, '/') [4] = 'person'\``,
    },
    {
      name: 'CAST to simple type',
      code: `\`SELECT CAST(url as integer ) FROM person\``,
    },
    {
      name: 'CAST to BIGINT',
      code: `\`SELECT CAST(url as BIGINT) FROM person\``,
    },
    {
      name: 'CAST to ARRAY',
      code: `\`SELECT CAST(url as ARRAY<VARCHAR>) FROM person\``,
    },
    {
      name: 'CAST to JSON',
      code: `\`SELECT CAST(url as JSON) FROM person\``,
    },
    {
      name: 'CAST to MAP',
      code: `\`SELECT CAST(requestheaders as MAP<VARCHAR,VARCHAR>) FROM person\``,
    },
    {
      name: 'CAST to complex ARRAY/MAP combination',
      code: `\`SELECT CAST(requestheaders as ARRAY<MAP<VARCHAR, VARCHAR>>) FROM person\``,
    },
    {
      name: 'TRY_CAST',
      code: `\`SELECT TRY_CAST(url as JSON) FROM person\``,
    },
    {
      name: 'CROSS JOIN UNNEST',
      // [TODO:] handle array item type extraction using schema dereferencing
      code: `\`SELECT url, cast(responsebody as ARRAY<VARCHAR>) as linkages
        FROM link
          CROSS JOIN UNNEST(linkages) AS t (score)
        WHERE
          cardinality(split(url, '/')) = 5
          AND method = 'GET'
          AND responsestatus = '200';
        \``,
    },
    {
      name: 'complex query - only SELECT - 1 table - with alias',
      code: `\`SELECT
        json_extract_scalar(l.responseheaders, '$["created-on"]') AS linkCreatedOn
      FROM
        link as l
      WHERE
        cardinality(split(l.url, '/')) = 7
        AND l.method = 'PUT'
        AND l.responsestatus = '204'\``,
    },
  ],
  invalid: [
    {
      name: 'invalid sql',
      code: `\`select foo as bar ffrom link\``,
      errors: [
        {
          messageId: 'SyntextError',
        },
      ],
    },
    {
      name: 'non-existing column',
      code: `\`select foo from link\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: "can't found column foo in tables: link",
          },
        },
      ],
    },
    {
      name: 'query target endpoint - only SELECT - 1 table - without alias',
      code: `\`SELECT
        json_extract_scalar(responseheaders, '$.foo') AS linkCreatedOn
      FROM
        link
      WHERE
        cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found responseheaders - $.foo',
          },
        },
      ],
    },
    {
      name: 'issuer - customer',
      code: `\`WITH parameters AS (
  SELECT
    '' AS p_from,
    '' AS p_to
    /* example:
     '2021-07-01T00:00:00.000Z' AS p_from,
     '2022-07-01T00:00:00.000Z' AS p_to
     */
),
person_data AS (
  SELECT
    DISTINCT split(url, '/') [ 5 ] AS personId,
    json_extract(responsebody, '$.person') AS person,
    json_extract_scalar(responsebody, '$.storageKeyId') AS keyId,
    json_extract_scalar(responseheaders, '$["created-on"]') AS createdOn,
    json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
  FROM
    person,
    parameters
  WHERE
    method = 'PUT'
    AND responsestatus = '200'
    AND split(url, '/') [ 4 ] = 'person'
    AND CARDINALITY(split(url, '/')) = 5
    AND json_extract_scalar(responseheaders, '$["updated-on"]') >= p_from
    AND json_extract_scalar(responseheaders, '$["updated-on"]') < p_to
),
flatten_attributes AS (
  SELECT
    keyId,
    personId,
    createdOn,
    updatedOn,
    CAST(
      json_extract(person, '$.addresses') AS ARRAY(MAP(VARCHAR, JSON))
    ) AS addresses,
    CAST(
      json_extract(person, '$.phones') AS ARRAY(MAP(VARCHAR, VARCHAR))
    ) AS phones,
    json_extract_scalar(person, '$.company') AS company,
    json_extract_scalar(person, '$.title') AS title,
    json_extract_scalar(person, '$.firstName') AS firstName,
    json_extract_scalar(person, '$.middleName') AS middleName,
    json_extract_scalar(person, '$.lastName') AS lastName,
    json_extract_scalar(person, '$.email') AS email,
    json_extract(person, '$.language') AS language,
    json_extract(person, '$.XtimeZone') AS timeZone
  FROM
    person_data
),
transformed_data AS (
  SELECT
    COALESCE(
      CAST(
        transform(
          addresses,
          eachAddress -> MAP(
            ARRAY [ 'postalCode',
            'city',
            'region',
            'type',
            'country',
            'streetLines' ],
            ARRAY [ CAST(
              COALESCE(
                '"{{' || keyId || ':' || CAST(eachAddress [ 'postalCode' ] AS VARCHAR) || '}}"',
                '""'
              ) AS JSON
            ),
            COALESCE(eachAddress [ 'city' ], CAST('""' AS JSON)),
            COALESCE(eachAddress [ 'region' ], CAST('""' AS JSON)),
            COALESCE(eachAddress [ 'type' ], CAST('""' AS JSON)),
            COALESCE(eachAddress [ 'country' ], CAST('""' AS JSON)) ]
          )
        ) AS JSON
      ),
      CAST(ARRAY [ ] AS JSON)
    ) AS addresses,
    COALESCE(
      CAST (
        transform(
          phones,
          eachPhone -> MAP(
            ARRAY [ 'number',
            'extension',
            'type' ],
            ARRAY [ COALESCE('{{' || keyId || ':' || eachPhone [ 'number' ] || '}}', ''),
            COALESCE(
              '{{' || keyId || ':' || eachPhone [ 'extension' ] || '}}',
              ''
            ),
            COALESCE(eachPhone [ 'type' ], '') ]
          )
        ) AS JSON
      ),
      CAST(ARRAY [ ] AS JSON)
    ) AS phones,
    CAST(
      COALESCE('"{{' || keyId || ':' || company || '}}"', '""') AS JSON
    ) AS company,
    CAST(
      COALESCE('"{{' || keyId || ':' || title || '}}"', '""') AS JSON
    ) AS title,
    CAST(
      COALESCE('"{{' || keyId || ':' || firstName || '}}"', '""') AS JSON
    ) AS firstName,
    CAST(
      COALESCE('"{{' || keyId || ':' || middleName || '}}"', '""') AS JSON
    ) AS middleName,
    CAST(
      COALESCE('"{{' || keyId || ':' || lastName || '}}"', '""') AS JSON
    ) AS lastName,
    CAST(
      COALESCE('"{{' || keyId || ':' || email || '}}"', '""') AS JSON
    ) AS email,
    COALESCE(language, CAST('""' AS JSON)) AS language,
    COALESCE(timeZone, CAST('""' AS JSON)) AS timeZone,
    CAST('"' || personId || '"' AS JSON) AS personId,
    CAST('"' || createdOn || '"' AS JSON) AS createdOn,
    updatedOn
  FROM
    flatten_attributes
),
constant_values AS (
  SELECT
    CAST('""' AS JSON) AS dependentOfPerson,
    CAST('"teampay-prod"' AS JSON) AS source,
    CAST('"choice-prod"' AS JSON) AS destination
)
SELECT
  CAST(
    MAP(
      ARRAY [ 'source',
      'destination',
      'company',
      'title',
      'firstName',
      'middleName',
      'lastName',
      'email',
      'language',
      'timeZone',
      'personId',
      'dependentOfPerson',
      'phones',
      'addresses',
      'createdOn',
      'updatedOn' ],
      ARRAY [ source,
      destination,
      company,
      title,
      firstName,
      middleName,
      lastName,
      email,
      language,
      timeZone,
      personId,
      dependentOfPerson,
      phones,
      addresses,
      createdOn,
      CAST('"' || updatedOn || '"' AS JSON) ]
    ) AS JSON
  ) AS CustomerReport,
  updatedOn
FROM
  transformed_data,
  constant_values
ORDER BY
  updatedOn\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found person - $.XtimeZone',
          },
        },
      ],
      only: true,
    },
  ],
});
