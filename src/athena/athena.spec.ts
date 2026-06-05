// athena/athena.spec.ts

import fs from 'node:fs';

import createTester from '../ts-tester.test.ts';
import rule, { ruleId } from './athena.ts';
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
      name: 'string instead of Template Literal',
      code: `'select * from link'`,
    },
    {
      name: 'Template literal with string interpolation',
      code: `\`
        select *
        from link
        where
          json_extract_scalar(responseheaders, '$["created-on"]') < '\${new Date().toISOString()}'
          and method = 'GET'
      \``,
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
      name: 'CROSS JOIN UNNEST - not referenced',
      // [TODO:] handle array item type extraction using schema dereferencing
      code: `\`SELECT url, cast(json_extract(responsebody, '$.links') as ARRAY<VARCHAR>) as linkages
        FROM link
          CROSS JOIN UNNEST(linkages) AS t (linkage)
        WHERE
          cardinality(split(url, '/')) = 5
          AND method = 'GET'
          AND responsestatus = '200';
        \``,
    },
    {
      name: 'CROSS JOIN UNNEST - referenced',
      // [TODO:] handle array item type extraction using schema dereferencing
      code: `\`WITH unnested as (SELECT url, cast(json_extract(responsebody, '$.links') as ARRAY<MAP<VARCHAR,VARCHAR>>) as linkages
        FROM link
          CROSS JOIN UNNEST(linkages) AS t (linkage)
        WHERE
          cardinality(split(url, '/')) = 5
          AND method = 'GET'
          AND responsestatus = '200')
        select json_extract(linkage, '$.subjectId') from unnested;
        \``,
    },
    {
      name: 'AND/OR conditions in WHERE',
      code: `\` select *
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
AND (
     (
       split(url, '/') [ 4 ] = 'card'
       AND cardinality(split(url, '/')) = 5
     )
     OR (
       split(url, '/') [ 4 ] = 'card'
       AND split(url, '/') [ 6 ] = 'number'
       AND cardinality(split(url, '/')) = 6
     )
   )
\``,
    },
    {
      name: 'multiple AND split conditions narrow to v1 card endpoint',
      code: `\`SELECT json_extract_scalar(responsebody, '$.card.applicationTransactionCounter') AS atc
FROM "payment-card"
WHERE method = 'PUT'
  AND responsestatus = '200'
  AND split(url, '/')[3] = 'v1'
  AND split(url, '/')[4] = 'card'
  AND cardinality(split(url, '/')) = 5\``,
    },
    {
      name: 'OR path conditions - v2-only field accessible via second OR branch',
      code: `\`SELECT json_extract_scalar(responsebody, '$.card.pinId') AS pinId
FROM "payment-card"
WHERE method = 'PUT'
  AND responsestatus = '200'
  AND (
    (split(url, '/')[4] = 'card' AND cardinality(split(url, '/')) = 5)
    OR
    (split(url, '/')[6] = 'card' AND cardinality(split(url, '/')) = 7)
  )\``,
    },
    {
      name: 'self-join with different aliases for same service table',
      code: `\`SELECT tcm.url, tcmch.url
FROM "teampay-card-management" AS tcm,
     "teampay-card-management" AS tcmch
WHERE tcm.method = 'PUT'
  AND cardinality(split(tcm.url, '/')) = 5
  AND split(tcm.url, '/')[4] = 'card'
  AND tcm.responsestatus = '200'
  AND split(tcmch.url, '/')[4] = 'cardholder'
  AND cardinality(split(tcmch.url, '/')) = 5
  AND tcmch.responsestatus = '200'
  AND tcmch.method = 'PUT'\``,
    },
    {
      name: 'split_part conditions narrow to v1 card endpoint',
      code: `\`SELECT json_extract_scalar(responsebody, '$.card.applicationTransactionCounter') AS atc
FROM "payment-card"
WHERE method = 'PUT'
  AND responsestatus = '200'
  AND split_part(url, '/', 3) = 'v1'
  AND split_part(url, '/', 4) = 'card'
  AND cardinality(split(url, '/')) = 5\``,
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
    {
      name: 'COUNT against array access expression',
      code: `\`SELECT
      COUNT(distinct (split(tcm.url, '/') [5])) AS cards
    FROM
      "teampay-card-management" AS tcm\``,
    },
    {
      name: 'QMR',
      code: `\`${fs.readFileSync('qmr.sql', 'utf-8')}\``,
    },
    {
      name: 'non-sql with similar keywords should not trigger errors',
      code: `describe('with data set up through API', async () => {});`,
    },
  ],
  invalid: [
    {
      name: 'invalid sql',
      code: `\`select foo as bar from link when 1=1\``,
      errors: [
        {
          messageId: 'SyntextError',
        },
      ],
    },
    {
      // PEG SyntaxError for "WHEN" on line 4; if location is reported correctly the error is on line 4
      // rather than line 1 (the whole-node fallback).
      name: 'syntax error location narrows to the offending token, not the whole SQL string',
      code: `\`SELECT
  foo AS bar
FROM link
WHEN 1=1\``,
      errors: [
        {
          messageId: 'SyntextError',
          line: 4,
        },
      ],
    },
    {
      // "non-existent" at SQL offsets 16–29 (14 chars). end.offset=30 (exclusive).
      // Source: backtick at 0, srcStart=1.
      // start: 1+16=17 → line 1, 0-based col 17 → RuleTester col 18.
      // end:   1+30=31 → line 1, 0-based col 31 → RuleTester endCol 32.
      name: 'unrecognised table name error location narrows to the table name in FROM',
      code: `\`SELECT url FROM "non-existent"\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'no matched api' },
          line: 1,
          column: 18,
          endLine: 1,
          endColumn: 32,
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
            errorMessage:
              "can't found column foo in tables: link; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders",
          },
        },
      ],
    },
    {
      // nonExistentCol at SQL offsets 7–21 (exclusive). Source: backtick at 0, srcStart=1.
      // start: 1+7=8 → line 1, 0-based col 8 → RuleTester col 9.
      // end:   1+21=22 → line 1, 0-based col 22 → RuleTester endCol 23.
      name: 'non-existing column with multiple tables lists all tables in error and narrows location to the column_ref',
      code: `\`SELECT nonExistentCol FROM link, "payment-card"\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              "can't found column nonExistentCol in tables: link, payment-card; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders",
          },
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 23,
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
            errorMessage:
              'property not found responseheaders - $.foo; available properties: last-modified, created-on, updated-on',
          },
        },
      ],
    },
    {
      name: 'UNION ALL - some selects are invalid',
      code: `\`
      SELECT
        json_extract_scalar(responseheaders, '$["created-on"]') AS linkChangedOn
      FROM
        link
      WHERE
        cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'
      UNION ALL
      SELECT
        json_extract_scalar(responseheaders, '$["Xupdated-on"]') AS linkChangedOn
      FROM
        link
      WHERE
        cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'
      \``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found responseheaders - $["Xupdated-on"]; available properties: last-modified, created-on, updated-on',
          },
        },
      ],
    },
    {
      name: 'invalid direct JSON style property access',
      code: `\`
        WITH unique_entries as (
          select
            cast(
              json_extract(requestbody, '$.postings') as array(map(varchar, varchar))
            ) as postings
          from
            ledger
          where
            method = 'PUT'
            and responsestatus = '204'
            and cardinality(split(url, '/')) = 5
            and split(url, '/') [ 4 ] = 'entry'
        )
        select
          posting [ 'XaccountId' ] as postingAccountId
        from
          unique_entries
          cross join unnest(postings) as t(posting)
      \``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found posting - $["XaccountId"]; available properties: amount, currency, type, createdOn, accountId',
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
            errorMessage:
              'property not found person - $.XtimeZone; available properties: company, title, firstName, middleName, lastName, addresses, phones, email, language, timeZone',
          },
        },
      ],
    },
    {
      name: 'issuer - authorization',
      code: `\`
WITH parameters AS (
  SELECT
    '' AS p_from,
    '' AS p_to
    /* example:
     '2021-07-01T00:00:00.000Z' AS p_from,
     '2022-07-01T00:00:00.000Z' AS p_to
     */
),
request_message AS (
  SELECT
    DISTINCT requestbody AS message
  FROM
    message
  WHERE
    method = 'PUT'
    AND responsestatus = '204'
    AND json_extract_scalar(requestbody, '$.responseCode') IS NULL
    AND json_extract_scalar(requestbody, '$.categorization.messageType') = 'PREAUTHORIZATION'
    AND json_extract_scalar(requestbody, '$.categorization.messageUsage') <> 'ADVICE'
),
response_message AS (
  SELECT
    DISTINCT requestbody AS message,
    json_extract_scalar(responseheaders, '$["created-on"]') AS responseMessageCreatedOn
  FROM
    message,
    parameters
  WHERE
    method = 'PUT'
    AND responsestatus = '204'
    AND json_extract_scalar(requestbody, '$.responseCode') IS NOT NULL
    AND json_array_length(json_extract(requestbody, '$.declineReasons')) = 0
    AND json_extract_scalar(requestbody, '$.approvedTotal.amount') <> '0'
    AND json_extract_scalar(requestbody, '$.entryId') IS NOT NULL
    AND json_extract_scalar(responseheaders, '$["created-on"]') >= p_from
    AND json_extract_scalar(responseheaders, '$["created-on"]') < p_to
),
card AS (
  SELECT
    DISTINCT split(url, '/') [ 5 ] AS cardId,
    json_extract(responsebody, '$.card') AS card
  FROM
    "payment-card",
    parameters
  WHERE
    method = 'PUT'
    AND responsestatus = '200'
    AND split(url, '/') [ 3 ] = 'v1'
    AND (
      (
        split(url, '/') [ 4 ] = 'card'
        AND cardinality(split(url, '/')) = 5
      )
      OR (
        split(url, '/') [ 4 ] = 'card'
        AND split(url, '/') [ 6 ] = 'number'
        AND cardinality(split(url, '/')) = 6
      )
    )
    AND json_extract_scalar(responseheaders, '$["created-on"]') < p_to
  UNION ALL
  SELECT
    DISTINCT split(url, '/') [ 7 ] AS cardId,
    json_extract(responsebody, '$.card') AS card
  FROM
    "payment-card",
    parameters
  WHERE
    method = 'PUT'
    AND responsestatus = '200'
    AND split(url, '/') [ 3 ] = 'v2'
    AND (
      (
        split(url, '/') [ 6 ] = 'card'
        AND cardinality(split(url, '/')) = 7
      )
      OR (
        split(url, '/') [ 6 ] = 'card'
        AND split(url, '/') [ 8 ] = 'number'
        AND cardinality(split(url, '/')) = 8
      )
    )
    AND json_extract_scalar(responseheaders, '$["created-on"]') < p_to
),
joined_data AS (
  SELECT
    req.message AS request,
    res.message AS response,
    cd.card AS card,
    res.responseMessageCreatedOn AS responseMessageCreatedOn
  FROM
    request_message AS req
    JOIN response_message AS res ON json_extract_scalar(res.message, '$.messageId') = json_extract_scalar(req.message, '$.messageId')
    JOIN card AS cd ON cd.cardId = json_extract_scalar(res.message, '$.cardId')
),
flatten_attributes AS (
  SELECT
    COALESCE(
      json_extract(request, '$.messageId'),
      CAST('""' AS JSON)
    ) AS messageId,
    COALESCE(
      json_extract(response, '$.entryId'),
      CAST('""' AS JSON)
    ) AS entryId,
    COALESCE(
      json_extract(response, '$.cardId'),
      CAST('""' AS JSON)
    ) AS cardId,
    COALESCE(json_extract(card, '$.bin'), CAST('""' AS JSON)) AS bin,
    COALESCE(
      json_extract(request, '$.transmissionDateTime'),
      CAST('""' AS JSON)
    ) AS transmissionDateTime,
    COALESCE(
      json_extract(request, '$.network'),
      CAST('""' AS JSON)
    ) AS network,
    COALESCE(
      json_extract(request, '$.acquirerNetwork'),
      CAST('""' AS JSON)
    ) AS acquirerNetwork,
    COALESCE(
      json_extract(response, '$.authorizationIdResponse'),
      CAST('""' AS JSON)
    ) AS authorizationIdResponse,
    COALESCE(
      json_extract(request, '$.categorization.messageType'),
      CAST('""' AS JSON)
    ) AS categorizationMessageType,
    COALESCE(
      json_extract(request, '$.categorization.messageUsage'),
      CAST('""' AS JSON)
    ) AS categorizationMessageUsage,
    COALESCE(
      json_extract(request, '$.categorization.category'),
      CAST('""' AS JSON)
    ) AS categorizationCategory,
    COALESCE(
      json_extract(request, '$.categorization.debitCredit'),
      CAST('""' AS JSON)
    ) AS categorizationDebitCredit,
    COALESCE(
      json_extract(request, '$.merchant.type'),
      CAST('""' AS JSON)
    ) AS merchantType,
    COALESCE(
      json_extract(request, '$.merchant.name'),
      CAST('""' AS JSON)
    ) AS merchantName,
    COALESCE(
      json_extract(request, '$.merchant.terminalIdentification'),
      CAST('""' AS JSON)
    ) AS merchantTerminalIdentification,
    COALESCE(
      json_extract(request, '$.acquirer.identificationCode'),
      CAST('""' AS JSON)
    ) AS acquirerIdentificationCode,
    COALESCE(
      json_extract(request, '$.merchant.address'),
      CAST('""' AS JSON)
    ) AS merchantAddress,
    COALESCE(
      json_extract(request, '$.merchant.city'),
      CAST('""' AS JSON)
    ) AS merchantCity,
    COALESCE(
      json_extract(request, '$.merchant.stateProvince'),
      CAST('""' AS JSON)
    ) AS merchantStateProvince,
    COALESCE(
      json_extract(request, '$.merchant.country'),
      CAST('""' AS JSON)
    ) AS merchantCountry,
    COALESCE(
      json_extract(response, '$.approvedTotal.amount'),
      CAST('""' AS JSON)
    ) AS approvedAmount,
    COALESCE(
      json_extract(response, '$.approvedTotal.Xcurrency'),
      CAST('""' AS JSON)
    ) AS approvedAmountCurrency,
    CAST('"teampay-prod"' as JSON) as source,
    CAST('"choice-prod"' as JSON) as destination,
    responseMessageCreatedOn
  FROM
    joined_data
)
SELECT
  CAST(
    MAP(
      ARRAY [ 'source',
      'destination',
      'messageId',
      'entryId',
      'cardId',
      'bin',
      'transactionDate',
      'network',
      'acquirerNetwork',
      'authCode',
      'categorization',
      'merchant',
      'cardAcceptor',
      'approvedAmount' ],
      ARRAY [ source,
      destination,
      messageId,
      entryId,
      cardId,
      bin,
      transmissionDateTime,
      network,
      acquirerNetwork,
      authorizationIdResponse,
      CAST(
        MAP(
          ARRAY [ 'messageType',
          'messageUsage',
          'category',
          'debitCredit' ],
          ARRAY [ categorizationMessageType,
          categorizationMessageUsage,
          categorizationCategory,
          categorizationDebitCredit ]
        ) AS JSON
      ),
      CAST(
        MAP(
          ARRAY [ 'type',
          'name' ],
          ARRAY [ merchantType,
          merchantName ]
        ) AS JSON
      ),
      CAST(
        MAP(
          ARRAY [ 'terminalIdentification',
          'identificationCode',
          'address',
          'city',
          'stateProvince',
          'country' ],
          ARRAY [ merchantTerminalIdentification,
          acquirerIdentificationCode,
          merchantAddress,
          merchantCity,
          merchantStateProvince,
          merchantCountry ]
        ) AS JSON
      ),
      CAST(
        MAP(
          ARRAY [ 'amount',
          'currency' ],
          ARRAY [ approvedAmount,
          approvedAmountCurrency ]
        ) AS JSON
      ) ]
    ) AS JSON
  ) AS AuthorizationReport,
  responseMessageCreatedOn
FROM
  flatten_attributes
ORDER BY
  responseMessageCreatedOn\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found response - $.approvedTotal.Xcurrency',
          },
        },
      ],
    },
    {
      name: 'issuer - transaction',
      code: `\`
WITH parameters AS (
  SELECT
    '' AS p_from,
    '' AS p_to
    /* example:
     '2021-07-01T00:00:00.000Z' AS p_from,
     '2022-07-01T00:00:00.000Z' AS p_to
     */
),
request_message AS (
  SELECT
    DISTINCT requestbody AS message
  FROM
    message
  WHERE
    method = 'PUT'
    AND responsestatus = '204'
    AND json_extract_scalar(requestbody, '$.responseCode') IS NULL
),
response_message AS (
  SELECT
    DISTINCT requestbody AS message,
    json_extract_scalar(responseheaders, '$["created-on"]') AS responseMessageCreatedOn
  FROM
    message,
    parameters
  WHERE
    method = 'PUT'
    AND responsestatus = '204'
    AND json_extract_scalar(requestbody, '$.responseCode') IS NOT NULL
    AND json_array_length(json_extract(requestbody, '$.declineReasons')) = 0
    AND json_extract_scalar(requestbody, '$.completedTotal.amount') <> '0'
    AND json_extract_scalar(requestbody, '$.approvedTotal.amount') <> '0'
    AND json_extract_scalar(requestbody, '$.entryId') IS NOT NULL
    AND json_extract_scalar(responseheaders, '$["created-on"]') >= p_from
    AND json_extract_scalar(responseheaders, '$["created-on"]') < p_to
),
card AS (
  SELECT
    DISTINCT split(url, '/') [ 5 ] AS cardId,
    json_extract(responsebody, '$.card') AS card
  FROM
    "payment-card",
    parameters
  WHERE
    method = 'PUT'
    AND responsestatus = '200'
    AND split(url, '/') [ 3 ] = 'v1'
    AND (
      (
        split(url, '/') [ 4 ] = 'card'
        AND cardinality(split(url, '/')) = 5
      )
      OR (
        split(url, '/') [ 4 ] = 'card'
        AND split(url, '/') [ 6 ] = 'number'
        AND cardinality(split(url, '/')) = 6
      )
    )
    AND json_extract_scalar(responseheaders, '$["created-on"]') < p_to
  UNION ALL
  SELECT
    DISTINCT split(url, '/') [ 7 ] AS cardId,
    json_extract(responsebody, '$.card') AS card
  FROM
    "payment-card",
    parameters
  WHERE
    method = 'PUT'
    AND responsestatus = '200'
    AND split(url, '/') [ 3 ] = 'v2'
    AND (
      (
        split(url, '/') [ 6 ] = 'card'
        AND cardinality(split(url, '/')) = 7
      )
      OR (
        split(url, '/') [ 6 ] = 'card'
        AND split(url, '/') [ 8 ] = 'number'
        AND cardinality(split(url, '/')) = 8
      )
    )
    AND json_extract_scalar(responseheaders, '$["created-on"]') < p_to
),
joined_data AS (
  SELECT
    req.message AS request,
    res.message AS response,
    cd.card AS card,
    res.responseMessageCreatedOn AS responseMessageCreatedOn
  FROM
    request_message AS req
    JOIN response_message AS res ON json_extract_scalar(res.message, '$.messageId') = json_extract_scalar(req.message, '$.messageId')
    JOIN card AS cd ON cd.cardId = json_extract_scalar(res.message, '$.cardId')
),
flatten_attributes AS (
  SELECT
    COALESCE(
      json_extract(request, '$.messageId'),
      CAST('""' AS JSON)
    ) AS messageId,
    COALESCE(
      json_extract(request, '$.matchedMessageId'),
      CAST('""' AS JSON)
    ) AS matchedMessageId,
    COALESCE(
      json_extract(response, '$.entryId'),
      CAST('""' AS JSON)
    ) AS entryId,
    COALESCE(
      json_extract(response, '$.cardId'),
      CAST('""' AS JSON)
    ) AS cardId,
    COALESCE(json_extract(card, '$.bin'), CAST('""' AS JSON)) AS bin,
    COALESCE(
      json_extract(request, '$.transmissionDateTime'),
      CAST('""' AS JSON)
    ) AS transmissionDateTime,
    COALESCE(
      json_extract(request, '$.network'),
      CAST('""' AS JSON)
    ) AS network,
    COALESCE(
      json_extract(request, '$.acquirerNetwork'),
      CAST('""' AS JSON)
    ) AS acquirerNetwork,
    COALESCE(
      json_extract(response, '$.authorizationIdResponse'),
      CAST('""' AS JSON)
    ) AS authorizationIdResponse,
    COALESCE(
      json_extract(request, '$.categorization.messageType'),
      CAST('""' AS JSON)
    ) AS categorizationMessageType,
    COALESCE(
      json_extract(request, '$.categorization.messageUsage'),
      CAST('""' AS JSON)
    ) AS categorizationMessageUsage,
    COALESCE(
      json_extract(request, '$.categorization.category'),
      CAST('""' AS JSON)
    ) AS categorizationCategory,
    COALESCE(
      json_extract(request, '$.categorization.debitCredit'),
      CAST('""' AS JSON)
    ) AS categorizationDebitCredit,
    COALESCE(
      json_extract(request, '$.merchant.type'),
      CAST('""' AS JSON)
    ) AS merchantType,
    COALESCE(
      json_extract(request, '$.merchant.name'),
      CAST('""' AS JSON)
    ) AS merchantName,
    COALESCE(
      json_extract(request, '$.merchant.terminalIdentification'),
      CAST('""' AS JSON)
    ) AS merchantTerminalIdentification,
    COALESCE(
      json_extract(request, '$.acquirer.identificationCode'),
      CAST('""' AS JSON)
    ) AS acquirerIdentificationCode,
    COALESCE(
      json_extract(request, '$.merchant.address'),
      CAST('""' AS JSON)
    ) AS merchantAddress,
    COALESCE(
      json_extract(request, '$.merchant.city'),
      CAST('""' AS JSON)
    ) AS merchantCity,
    COALESCE(
      json_extract(request, '$.merchant.stateProvince'),
      CAST('""' AS JSON)
    ) AS merchantStateProvince,
    COALESCE(
      json_extract(request, '$.merchant.country'),
      CAST('""' AS JSON)
    ) AS merchantCountry,
    COALESCE(
      json_extract(response, '$.approvedTotal.amount'),
      CAST('""' AS JSON)
    ) AS approvedAmount,
    COALESCE(
      json_extract(response, '$.approvedTotal.Xcurrency'),
      CAST('""' AS JSON)
    ) AS approvedAmountCurrency,
    CAST('"teampay-prod"' as JSON) as source,
    CAST('"choice-prod"' as JSON) as destination,
    responseMessageCreatedOn
  FROM
    joined_data
)
SELECT
  CAST(
    MAP(
      ARRAY [ 'source',
      'destination',
      'messageId',
      'matchedMessageId',
      'entryId',
      'cardId',
      'bin',
      'transactionDate',
      'network',
      'acquirerNetwork',
      'authCode',
      'categorization',
      'merchant',
      'cardAcceptor',
      'approvedAmount' ],
      ARRAY [ source,
      destination,
      messageId,
      matchedMessageId,
      entryId,
      cardId,
      bin,
      transmissionDateTime,
      network,
      acquirerNetwork,
      authorizationIdResponse,
      CAST(
        MAP(
          ARRAY [ 'messageType',
          'messageUsage',
          'category',
          'debitCredit' ],
          ARRAY [ categorizationMessageType,
          categorizationMessageUsage,
          categorizationCategory,
          categorizationDebitCredit ]
        ) AS JSON
      ),
      CAST(
        MAP(
          ARRAY [ 'type',
          'name' ],
          ARRAY [ merchantType,
          merchantName ]
        ) AS JSON
      ),
      CAST(
        MAP(
          ARRAY [ 'terminalIdentification',
          'identificationCode',
          'address',
          'city',
          'stateProvince',
          'country' ],
          ARRAY [ merchantTerminalIdentification,
          acquirerIdentificationCode,
          merchantAddress,
          merchantCity,
          merchantStateProvince,
          merchantCountry ]
        ) AS JSON
      ),
      CAST(
        MAP(
          ARRAY [ 'amount',
          'currency' ],
          ARRAY [ approvedAmount,
          approvedAmountCurrency ]
        ) AS JSON
      ) ]
    ) AS JSON
  ) AS TransactionReport,
  responseMessageCreatedOn
FROM
  flatten_attributes
ORDER BY
  responseMessageCreatedOn
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found response - $.approvedTotal.Xcurrency',
          },
        },
      ],
    },
    {
      name: 'issuer - card',
      code: `\`WITH parameters AS (
  SELECT
    '' AS p_from,
    '' AS p_to
    /* example:
     '2021-07-01T00:00:00.000Z' AS p_from,
     '2022-07-01T00:00:00.000Z' AS p_to
     */
),
card_creation AS (
  SELECT
    split(url, '/') [ 5 ] AS cardId,
    json_extract(responsebody, '$.card') AS card,
    json_extract_scalar(responsebody, '$.storageKeyId') AS keyId,
    json_extract_scalar(responseheaders, '$["created-on"]') AS createdOn,
    json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
    AND responsestatus = '200'
    AND split(url, '/') [ 3 ] = 'v1'
    AND (
      (
        split(url, '/') [ 4 ] = 'card'
        AND cardinality(split(url, '/')) = 5
      )
      OR (
        split(url, '/') [ 4 ] = 'card'
        AND split(url, '/') [ 6 ] = 'number'
        AND cardinality(split(url, '/')) = 6
      )
    )
  UNION ALL
  SELECT
    split(url, '/') [ 7 ] AS cardId,
    json_extract(responsebody, '$.card') AS card,
    json_extract_scalar(responsebody, '$.storageKeyId') AS keyId,
    json_extract_scalar(responseheaders, '$["created-on"]') AS createdOn,
    json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
    AND responsestatus = '200'
    AND split(url, '/') [ 3 ] = 'v2'
    AND (
      (
        split(url, '/') [ 6 ] = 'card'
        AND cardinality(split(url, '/')) = 7
      )
      OR (
        split(url, '/') [ 6 ] = 'card'
        AND split(url, '/') [ 8 ] = 'number'
        AND cardinality(split(url, '/')) = 8
      )
    )
),
card_update AS (
  SELECT
    split(url, '/') [ 5 ] AS cardId,
    split(url, '/') [ 6 ] AS fieldKey,
    split(url, '/') [ 7 ] AS fieldValue,
    json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
    AND responsestatus = '204'
    AND split(url, '/') [ 3 ] = 'v1'
    AND split(url, '/') [ 4 ] = 'card'
    AND cardinality(split(url, '/')) = 7
  UNION ALL
  SELECT
    split(url, '/') [ 7 ] AS cardId,
    split(url, '/') [ 8 ] AS fieldKey,
    split(url, '/') [ 9 ] AS fieldValue,
    json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
    AND responsestatus = '204'
    AND split(url, '/') [ 3 ] = 'v2'
    AND split(url, '/') [ 6 ] = 'card'
    AND cardinality(split(url, '/')) = 9
),
matching_cards AS (
  SELECT
    cardId || '|' || updatedOn AS cardIdAndUpdatedOn
  FROM
    card_creation,
    parameters
  WHERE
    updatedOn >= p_from
    AND updatedOn < p_to
  UNION ALL
  SELECT
    cardId || '|' || updatedOn AS cardIdAndUpdatedOn
  FROM
    card_update,
    parameters
  WHERE
    updatedOn >= p_from
    AND updatedOn < p_to
),
combined_card_history AS (
  SELECT
    cardId,
    createdOn,
    updatedOn,
    keyId,
    json_extract_scalar(card, '$.expirationDate') AS expirationDate,
    json_extract_scalar(card, '$.serviceCode') AS serviceCode,
    json_extract_scalar(card, '$.sequenceNumber') AS sequenceNumber,
    json_extract_scalar(card, '$.last4') AS last4,
    json_extract_scalar(card, '$.bin') AS bin,
    updatedOn || '|' || json_extract_scalar(card, '$.active') AS active,
    updatedOn || '|' || json_extract_scalar(card, '$.block') AS block,
    updatedOn || '|' || json_extract_scalar(card, '$.lock') AS lock,
    updatedOn || '|' || json_extract_scalar(card, '$.state') AS state,
    updatedOn || '|' || json_extract_scalar(card, '$.capture') AS capture
  FROM
    card_creation
  UNION ALL
  SELECT
    cardId,
    '' AS createdOn,
    updatedOn,
    '' AS keyId,
    '' AS expirationDate,
    '' AS sequenceNumber,
    '' AS last4,
    '' AS bin,
    '' AS serviceCode,
    IF(
      fieldKey = 'active',
      updatedOn || '|' || fieldValue,
      '1|1'
    ) AS active,
    IF(
      fieldKey = 'block',
      updatedOn || '|' || fieldValue,
      '1|1'
    ) AS block,
    IF(fieldKey = 'lock', updatedOn || '|' || fieldValue, '1|1') AS lock,
    IF(
      fieldKey = 'state',
      updatedOn || '|' || fieldValue,
      '1|1'
    ) AS state,
    IF(
      fieldKey = 'capture',
      updatedOn || '|' || fieldValue,
      '1|1'
    ) AS capture
  FROM
    card_update
),
merged_card_data AS (
  SELECT
    split(m.cardIdAndUpdatedOn, '|') [ 1 ] AS cardId,
    split(m.cardIdAndUpdatedOn, '|') [ 2 ] AS updatedOn,
    MAX(h.createdOn) AS createdOn,
    MAX(h.keyId) AS keyId,
    MAX(h.expirationDate) AS expirationDate,
    MAX(h.serviceCode) AS serviceCode,
    MAX(h.sequenceNumber) AS sequenceNumber,
    MAX(h.last4) AS last4,
    MAX(h.bin) AS bin,
    split(MAX(h.active), '|') [ 2 ] AS active,
    split(MAX(h.block), '|') [ 2 ] AS block,
    split(MAX(h.lock), '|') [ 2 ] AS lock,
    split(MAX(h.state), '|') [ 2 ] AS state,
    split(MAX(h.capture), '|') [ 2 ] AS capture
  FROM
    matching_cards m,
    combined_card_history h
  WHERE
    h.cardId = split(m.cardIdAndUpdatedOn, '|') [ 1 ]
    AND h.updatedOn <= split(m.cardIdAndUpdatedOn, '|') [ 2 ]
  GROUP BY
    m.cardIdAndUpdatedOn
),
link_data AS (
  SELECT
    DISTINCT split(link.url, '/') [ 5 ] AS cardId,
    split(link.url, '/') [ 7 ] AS personId
  FROM
    link
  WHERE
    method = 'PUT'
    AND responsestatus = '204'
    AND split(link.url, '/') [ 6 ] = 'card.hasProfile'
),
joined_data AS (
  SELECT
    card.cardId AS cardId,
    card.expirationDate AS expirationDate,
    card.state AS state,
    card.active AS active,
    card.block AS block,
    card.createdOn AS createdOn,
    card.serviceCode AS serviceCode,
    card.lock AS lock,
    card.capture AS capture,
    card.sequenceNumber AS sequenceNumber,
    card.last4 AS last4,
    card.bin AS bin,
    card.updatedOn AS updatedOn,
    link.XpersonId AS personId,
    'teampay-prod' AS source,
    'choice-prod' AS destination
  FROM
    parameters, merged_card_data AS card
    LEFT OUTER JOIN link_data AS link ON card.cardId = link.cardId
  WHERE
    card.updatedOn >= p_from
)
SELECT
  CAST(
    MAP(
      ARRAY [ 'source',
      'destination',
      'cardId',
      'expirationDate',
      'state',
      'active',
      'block',
      'createdOn',
      'serviceCode',
      'lock',
      'capture',
      'sequenceNumber',
      'last4',
      'bin',
      'updatedOn',
      'personId' ],
      ARRAY [ source,
      destination,
      cardId,
      expirationDate,
      state,
      active,
      block,
      createdOn,
      serviceCode,
      lock,
      capture,
      sequenceNumber,
      last4,
      bin,
      updatedOn,
      personId ]
    ) AS JSON
  ) AS CardReport,
  updatedOn
FROM
  joined_data
ORDER BY
  updatedOn\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: `can't found column XpersonId in tables: parameters, card_creation, card_update, matching_cards, combined_card_history, merged_card_data, link_data; available columns: cardId, personId`,
          },
        },
      ],
    },
    {
      name: 'issuer - interchange',
      code: `\`WITH parameters AS (
  SELECT
    '' AS p_from,
    '' AS p_to,
    '' AS p_source
),
mastercard_data AS (
  SELECT 
    DISTINCT 
    CAST(p.p_source AS JSON) AS Network,
    json_extract(i.requestbody, '$.file.fileDateTime') AS SourceDate,
    json_extract(i.requestbody, '$.file.fileIdentifier') AS SourceIdentifier,
    json_extract(i.requestbody, '$.file.recordIdentifier') AS RecordIdentifier,
    json_extract(i.requestbody, '$.matchedMessageId') AS MatchedMessageId,
    json_extract(i.requestbody, '$.transmissionDateTime') AS TransmissionDateTime,
    json_extract(i.requestbody, '$.cardId') AS CardId,
    json_extract(i.requestbody, '$.categorization.category') AS Category,
    json_extract(i.requestbody, '$.categorization.debitCredit') AS SettlementDebitCredit,
    json_extract(i.requestbody, '$.settlementAmount.amount') AS SettlementAmount,
    json_extract(i.requestbody, '$.settlementAmount.currency') AS SettlementCurrency,
    json_extract(i.requestbody, '$.merchant.type') AS MerchantType,
    json_extract(i.requestbody, '$.merchant.panEntryMethod') AS PanEntryMethod,
    json_extract(i.requestbody, '$.isCrossBorder') AS IsCrossBorder,
    json_extract(i.requestbody, '$.interchangeFeeAmount.amount') AS InterchangeFeeAmount,
    json_extract(i.requestbody, '$.interchangeFeeAmount.currency') AS InterchangeFeeCurrency,
    json_extract(i.requestbody, '$.interchangeFeeAmountExtended.amount') AS InterchangeFeeExtendedAmount,
    json_extract(i.requestbody, '$.interchangeFeeAmountExtended.currency') AS InterchangeFeeExtendedCurrency,
    CAST(CAST(json_extract(i.requestbody, '$.interchangeFeeAmountExtended.XamountDecimalPosition') as int) as JSON) AS InterchangeFeeExtendedDecimalPosition,
    json_extract(i.requestbody, '$.interchangeDebitCredit') AS InterchangeFeeDebitCredit,
    if(json_extract_scalar(i.requestbody, '$.categorization.debitCredit') = 'DEBIT', cast(json_extract_scalar(i.requestbody, '$.settlementAmount.amount') as bigint), 0) as DebitSettlementAmountValue,
    if(json_extract_scalar(i.requestbody, '$.categorization.debitCredit') = 'CREDIT', cast(json_extract_scalar(i.requestbody, '$.settlementAmount.amount') as bigint), 0) as CreditSettlementAmountValue,
    if(json_extract_scalar(i.requestbody, '$.categorization.debitCredit') = 'DEBIT', cast(json_extract_scalar(i.requestbody, '$.settlementAmount.amount') as bigint) * -1, cast(json_extract_scalar(i.requestbody, '$.settlementAmount.amount') as bigint)) as SettlementAmountValue,
    if(json_extract_scalar(i.requestbody, '$.interchangeDebitCredit') = 'DEBIT', cast(json_extract_scalar(i.requestbody, '$.interchangeFeeAmount.amount') as bigint) * -1, cast(json_extract_scalar(i.requestbody, '$.interchangeFeeAmount.amount') as bigint)) as InterchangeAmountValue,
    CAST('teampay-prod' AS JSON) AS source,
    CAST('choice-prod' AS JSON) AS destination
  FROM 
    interchange AS i,
    parameters AS p
  WHERE 
    json_extract_scalar(i.requestbody, '$.file.fileDescription') = if(p.p_source = 'CREDIT MASTERCARD', 'CHKDX001', 'interchange')
    AND i.responsestatus = '204'
    AND json_extract_scalar(i.requestbody, '$.file.fileDateTime') >= p.p_from
    AND json_extract_scalar(i.requestbody, '$.file.fileDateTime') < p.p_to
),
matched_json_records AS (
SELECT
  CAST(
    MAP(
      ARRAY [ 
        'source', 
        'destination', 
        'network', 
        'interchangeSource', 
        'matchedMessageId', 
        'transmissionDateTime', 
        'cardId', 
        'categorization', 
        'settlementAmount', 
        'merchant', 
        'isCrossBorder', 
        'interchangeFeeAmount', 
        'interchangeFeeAmountExtended', 
        'interchangeDebitCredit',
        'recordType'
      ],
      ARRAY [ 
        source,
        destination,
        Network,
        CAST(
          MAP(
            ARRAY [ 'sourceDateTime', 'sourceIdentifier', 'recordIdentifier' ],
            ARRAY [ SourceDate, SourceIdentifier, RecordIdentifier ]
          )
        AS JSON),
        MatchedMessageId,
        TransmissionDateTime,
        CardId,
        CAST(
          MAP(
            ARRAY [ 'category', 'debitCredit' ],
            ARRAY [ Category, SettlementDebitCredit ]
          )
        AS JSON),
        CAST(
          MAP(
            ARRAY [ 'amount', 'currency' ],
            ARRAY [ SettlementAmount, SettlementCurrency ]
          )
        AS JSON),
        CAST(
          MAP(
            ARRAY [ 'type', 'panEntryMethod' ],
            ARRAY [ MerchantType, PanEntryMethod ]
          )
        AS JSON),
        CAST(CAST(IsCrossBorder AS BOOLEAN) AS JSON),
        CAST(
          MAP(
            ARRAY [ 'amount', 'currency' ],
            ARRAY [ InterchangeFeeAmount, InterchangeFeeCurrency ]
          )
        AS JSON),
        CAST(
          MAP(
            ARRAY [ 'amount', 'amountDecimalPosition', 'currency' ],
            ARRAY [ InterchangeFeeExtendedAmount, InterchangeFeeExtendedDecimalPosition, InterchangeFeeExtendedCurrency ]
          )
        AS JSON),
        InterchangeFeeDebitCredit,
        CAST('ISSUER INTERCHANGE RECORD' AS JSON)
      ]
    ) AS JSON
  ) AS InterchangeReport
FROM
  mastercard_data
WHERE
  MatchedMessageId IS NOT NULL
),
unmatched_json_records AS (
SELECT
  CAST(
    MAP(
      ARRAY [ 
        'source', 
        'destination', 
        'network', 
        'interchangeSource', 
        'transmissionDateTime', 
        'cardId', 
        'categorization', 
        'settlementAmount', 
        'merchant', 
        'isCrossBorder', 
        'interchangeFeeAmount', 
        'interchangeFeeAmountExtended', 
        'interchangeDebitCredit',
        'recordType'
      ],
      ARRAY [ 
        source,
        destination,
        Network,
        CAST(
          MAP(
            ARRAY [ 'sourceDateTime', 'sourceIdentifier', 'recordIdentifier' ],
            ARRAY [ SourceDate, SourceIdentifier, RecordIdentifier ]
          )
        AS JSON),
        TransmissionDateTime,
        CardId,
        CAST(
          MAP(
            ARRAY [ 'category', 'debitCredit' ],
            ARRAY [ Category, SettlementDebitCredit ]
          )
        AS JSON),
        CAST(
          MAP(
            ARRAY [ 'amount', 'currency' ],
            ARRAY [ SettlementAmount, SettlementCurrency ]
          )
        AS JSON),
        CAST(
          MAP(
            ARRAY [ 'type', 'panEntryMethod' ],
            ARRAY [ MerchantType, PanEntryMethod ]
          )
        AS JSON),
        CAST(CAST(IsCrossBorder AS BOOLEAN) AS JSON),
        CAST(
          MAP(
            ARRAY [ 'amount', 'currency' ],
            ARRAY [ InterchangeFeeAmount, InterchangeFeeCurrency ]
          )
        AS JSON),
        CAST(
          MAP(
            ARRAY [ 'amount', 'amountDecimalPosition', 'currency' ],
            ARRAY [ InterchangeFeeExtendedAmount, InterchangeFeeExtendedDecimalPosition, InterchangeFeeExtendedCurrency ]
          )
        AS JSON),
        InterchangeFeeDebitCredit,
        CAST('ISSUER INTERCHANGE RECORD' AS JSON)
      ]
    ) AS JSON
  ) AS InterchangeReport
FROM
  mastercard_data
WHERE
  MatchedMessageId IS NULL
)
SELECT
  InterchangeReport
FROM
  matched_json_records
UNION ALL
SELECT
  InterchangeReport
FROM
  unmatched_json_records
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found requestbody - $.interchangeFeeAmountExtended.XamountDecimalPosition; available properties: file, matchedMessageId, cardId, transmissionDateTime, referenceNumber, categorization, systemTraceAuditNumber, merchant, adviceResponse, settlementAmount, isCrossBorder, issuerInterchangeGroupId, interchangeFeeAmount, interchangeDebitCredit, interchangeFeeAmountExtended',
          },
        },
      ],
    },
    {
      name: 'teampay-issuer - journal',
      code: `\`with parameters as (
  select
    '' as p_from,
    '' as p_to
    /* example:
     '2022-03-01T00:00:00.000Z' as p_from,
     '2022-03-15T00:00:00.000Z' as p_to
     */
),
client_names as (
  select
    distinct split(url, '/') [ 5 ] as clientId,
    json_extract_scalar(responseheaders, '$["updated-on"]') as updatedOn,
    json_extract_scalar(responsebody, '$.name') as clientName
  from
    "teampay-client-management"
  where
    method = 'PUT'
    and responsestatus = '200'
    and cardinality(split(url, '/')) = 5
    and split(url, '/') [ 4 ] = 'client'
),
client_payment_sources as (
  select
    json_extract_scalar(requestbody, '$.clientId') as clientId,
    array_agg(split(url, '/') [ 5 ]) as paymentSourceIds
  from
    "teampay-client-management"
  where
    method = 'PUT'
    and responsestatus = '200'
    and cardinality(split(url, '/')) = 5
    and split(url, '/') [ 4 ] = 'ach-payment-source'
  group by
    json_extract_scalar(requestbody, '$.clientId')
),
ledger_account_names as (
  select
    /* TODO: replace magic number (should be length('/ledger/v1/account/')+1 ), length function does not work in aws-nock */
    distinct substr(url, 20) as accountId,
    json_extract_scalar(requestbody, '$.name') as accountName
  from
    "ledger"
  where
    method = 'PUT'
    and responsestatus = '204'
    and split_part(url, '/', 4) = 'account'
),
unique_entries as (
  select
    distinct split(url, '/') [ 5 ] as entryId,
    json_extract_scalar(responseheaders, '$["created-on"]') as entryCreatedOn,
    cast(
      json_extract(requestbody, '$.postings') as array(map(varchar, varchar))
    ) as postings
  from
    ledger
  where
    method = 'PUT'
    and responsestatus = '204'
    and cardinality(split(url, '/')) = 5
    and split(url, '/') [ 4 ] = 'entry'
),
flattened_postings as (
  select
    entryId,
    entryCreatedOn,
    posting [ 'accountId' ] as postingAccountId,
    if(
      strpos(posting [ 'accountId' ], '-PENDING') > 0,
      substr(
        posting [ 'accountId' ],
        1,
        /* TODO: replace magic number (should be length('-PENDING')), length function does not work in aws-nock */
        length(posting [ 'accountId' ]) - 8
      ),
      if(
        strpos(posting [ 'accountId' ], '/') > 0,
        split(posting [ 'accountId' ], '/') [ 1 ],
        posting [ 'accountId' ]
      )
    ) as postingRootAccountId,
    coalesce(posting [ 'createdOn' ], entryCreatedOn) as postingCreatedOn,
    posting [ 'type' ] as postingType,
    posting [ 'amount' ] as postingAmount,
    posting [ 'Xcurrency' ] as postingCurrency
  from
    parameters,
    unique_entries
    cross join unnest(postings) as t(posting)
  where
    coalesce(posting [ 'createdOn' ], entryCreatedOn) >= p_from
    and coalesce(posting [ 'createdOn' ], entryCreatedOn) < p_to
),
posting_payment_source_client_name as (
  select
    p.postingCreatedOn || '|' || p.postingRootAccountId as postingAccountKey,
    split(max(cn.updatedOn || '|' || cn.clientName), '|') [ 2 ] as clientName
  from
    flattened_postings p,
    client_payment_sources cps,
    client_names cn
  where
    contains(cps.paymentSourceIds, p.postingRootAccountId)
    and cps.clientId = cn.clientId
    and cn.updatedOn <= p.postingCreatedOn
  group by
    p.postingCreatedOn || '|' || p.postingRootAccountId
),
posting_client_name as (
  select
    p.postingCreatedOn || '|' || p.postingRootAccountId as postingAccountKey,
    split(max(cn.updatedOn || '|' || cn.clientName), '|') [ 2 ] as clientName
  from
    flattened_postings p,
    client_names cn
  where
    cn.clientId = p.postingRootAccountId
    and cn.updatedOn <= p.postingCreatedOn
  group by
    p.postingCreatedOn || '|' || p.postingRootAccountId
),
postings_as_json as (
  select
    cast('"' || p.entryId || '"' as json) as entryId,
    entryCreatedOn,
    cast(
      map(
        array [ 'accountId',
        'accountName',
        'createdOn',
        'type',
        'amount',
        'currency',
        'paymentSourceType' ],
        array [ cast('"' || p.postingAccountId || '"' as json),
        cast(
          '"' || coalesce(
            if (
              ppscn.clientName is not null,
              if(
                a.accountName is not null,
                ppscn.clientName || ' - ' || a.accountName,
                ppscn.clientName
              ),
              null
            ),
            pcn.clientName,
            a.accountName,
            ''
          ) || '"' as json
        ),
        cast('"' || p.postingCreatedOn || '"' as json),
        cast('"' || p.postingType || '"' as json),
        cast('"' || p.postingAmount || '"' as json),
        cast('"' || p.postingCurrency || '"' as json),
        cast(
          '"' || if (
            cps.paymentSourceIds is not null,
            'ACH',
            'NOT APPLICABLE'
          ) || '"' as json
        ) ]
      ) as json
    ) as posting
  from
    flattened_postings as p
    left outer join client_payment_sources as cps on contains(cps.paymentSourceIds, p.postingRootAccountId)
    or cps.clientId = p.postingRootAccountId
    left outer join posting_client_name as pcn on pcn.postingAccountKey = p.postingCreatedOn || '|' || p.postingRootAccountId
    left outer join posting_payment_source_client_name as ppscn on ppscn.postingAccountKey = p.postingCreatedOn || '|' || p.postingRootAccountId
    left outer join ledger_account_names as a on a.accountId = p.postingAccountId
),
journal_entries as (
  select
    json_format(
      cast(
        map(
          array [ 'recordType',
          'source',
          'destination',
          'entryId',
          'createdOn',
          'postings' ],
          array [ cast('"ISSUER JOURNAL ENTRY"' as json),
          cast('"teampay-prod"' as json),
          cast('"choice-prod"' as json),
          entryId,
          cast('"' || max(entryCreatedOn) || '"' as json),
          cast(array_agg(posting) as json) ]
        ) as json
      )
    ) as journalEntry,
    max(entryCreatedOn) as entryCreatedOn
  from
    postings_as_json
  group by
    entryId
)
select
  journalEntry,
  entryCreatedOn
from
  journal_entries
order by
  entryCreatedOn\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found posting - $["Xcurrency"]; available properties: amount, currency, type, createdOn, accountId',
          },
        },
      ],
    },
    {
      name: 'AND/OR conditions in WHERE',
      code: `\`select
    json_extract(requestbody, '$.encryptedCardNumber') AS encryptedCardNumber,
    json_extract(requestbody, '$.cardNumberLength') AS cardNumberLength
    ,json_extract(requestbody, '$.xxx') AS xxx
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'multiple AND conditions restrict to v2 endpoint - v1-only field is not available',
      code: `\`SELECT json_extract_scalar(responsebody, '$.card.applicationTransactionCounter') AS atc
FROM "payment-card"
WHERE method = 'PUT'
  AND responsestatus = '200'
  AND split(url, '/')[3] = 'v2'
  AND split(url, '/')[6] = 'card'
  AND cardinality(split(url, '/')) = 7\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found responsebody - $.card.applicationTransactionCounter; available properties: dataEncryptionKeyId, storageKeyId, encryptedDataEncryptionKey, card',
          },
        },
      ],
    },
    {
      name: 'OR conditions - field absent from all matched endpoints',
      code: `\`SELECT json_extract_scalar(responsebody, '$.card.nonExistentField') AS x
FROM "payment-card"
WHERE method = 'PUT'
  AND responsestatus = '200'
  AND (
    (split(url, '/')[4] = 'card' AND cardinality(split(url, '/')) = 5)
    OR
    (split(url, '/')[6] = 'card' AND cardinality(split(url, '/')) = 7)
  )\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found responsebody - $.card.nonExistentField',
          },
        },
      ],
    },
    {
      name: 'split_part conditions restrict to v2 endpoint - v1-only field is not available',
      code: `\`SELECT json_extract_scalar(responsebody, '$.card.applicationTransactionCounter') AS atc
FROM "payment-card"
WHERE method = 'PUT'
  AND responsestatus = '200'
  AND split_part(url, '/', 3) = 'v2'
  AND split_part(url, '/', 6) = 'card'
  AND cardinality(split(url, '/')) = 7\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              'property not found responsebody - $.card.applicationTransactionCounter; available properties: dataEncryptionKeyId, storageKeyId, encryptedDataEncryptionKey, card',
          },
        },
      ],
    },
    {
      name: 'error location is narrowed to the exact json_extract_scalar call (single-line SQL)',
      // json_extract_scalar starts at SQL offset 7 (after "SELECT ") and ends at offset 63.
      // sqlStartOffset = 1 (backtick at code[0], SQL content at code[1]).
      // start: 1+7=8 → line 1, 0-based col 8 → RuleTester col 9.
      // end:   1+63=64 → line 1, 0-based col 64 → RuleTester endCol 65.
      code: `\`SELECT json_extract_scalar(responsebody, '$.nonExistentField') AS x FROM "payment-card" WHERE method = 'GET' AND responsestatus = '200'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'property not found responsebody - $.nonExistentField' },
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 65,
        },
      ],
    },
    {
      name: 'error location is narrowed to the exact json_extract_scalar call (multi-line SQL, call on line 2)',
      // json_extract_scalar starts at SQL offset 9 (SELECT\n + 2 spaces) and ends at offset 65.
      // sqlStartOffset = 1.
      // start: 1+9=10  → splits to line 2, 0-based col 2 → RuleTester line 2, col 3.
      // end:   1+65=66 → splits to line 2, 0-based col 58 → RuleTester endLine 2, endCol 59.
      code: `\`SELECT
  json_extract_scalar(responsebody, '$.nonExistentField') AS x
FROM "payment-card" WHERE method = 'GET' AND responsestatus = '200'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'property not found responsebody - $.nonExistentField' },
          line: 2,
          column: 3,
          endLine: 2,
          endColumn: 59,
        },
      ],
    },
    {
      // Uses a plain string (not a template literal) so that ${''}  appears as a literal
      // template expression in the analyzed source rather than being evaluated by the test runner.
      // quasi[0] cooked = "SELECT " (SQL offsets 0-6, source offsets 1-7).
      // quasi[1] cooked = "json_extract_scalar(...)" (SQL offset 7 onwards).
      // quasi[1].range[0] = 12 (the closing } of ${''}) → quasi[1] srcStart = 13.
      // json_extract_scalar start: SQL offset 7 → source offset 13 → line 1, 0-based col 13 → col 14.
      // json_extract_scalar end:   SQL offset 63 → source offset 69 → line 1, 0-based col 69 → endCol 70.
      name: 'error location accounts for template expressions that appear before the error in the SQL',
      // eslint-disable-next-line no-template-curly-in-string
      code: "`SELECT ${''}json_extract_scalar(responsebody, '$.nonExistentField') AS x FROM \"payment-card\" WHERE method = 'GET' AND responsestatus = '200'`",
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'property not found responsebody - $.nonExistentField' },
          line: 1,
          column: 14,
          endLine: 1,
          endColumn: 70,
        },
      ],
    },
    {
      // nonExistentCol at SQL offsets 7–21 (exclusive). Source: backtick at 0, srcStart=1.
      // start: 1+7=8 → line 1, 0-based col 8 → RuleTester col 9.
      // end:   1+21=22 → line 1, 0-based col 22 → RuleTester endCol 23.
      name: 'error location is narrowed to the exact column_ref when the column is not found',
      code: `\`SELECT nonExistentCol FROM "payment-card" WHERE method = 'GET' AND responsestatus = '200'\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              "can't found column nonExistentCol in tables: payment-card; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders",
          },
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 23,
        },
      ],
    },
    {
      name: 'schema validation should work for complex column expression - using || operator and invalid property used not as the first part in the expression',
      code: `\`select 
    json_extract(requestbody, '$.encryptedCardNumber') || json_extract(requestbody, '$.xxx')
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work for complex column expression - invlidate property used inside IF condition',
      code: `\`select 
      IF(
        json_extract_scalar(requestbody, '$.xxx') = 'XXX',
        'Domestic',
        'International'
      ) AS Domestic
  FROM
    "payment-card"
  WHERE
    method = 'PUT'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work inside WHERE conditions as well',
      code: `\`select * FROM
    "payment-card"
  WHERE
    method = 'PUT'
    and json_extract_scalar(requestbody, '$.xxx') = 'XXX'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work inside GROUP BY as well',
      code: `\`select count(*) FROM
    "payment-card"
  WHERE
    method = 'PUT'
  GROUP BY json_extract_scalar(requestbody, '$.xxx')
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work inside HAVING as well',
      code: `\`select count(*) FROM
    "payment-card"
  WHERE
    method = 'PUT'
  GROUP BY method
  HAVING json_extract_scalar(requestbody, '$.xxx') = 'XXX'
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
    {
      name: 'schema validation should work inside ORDER BY as well',
      code: `\`select * FROM
    "payment-card"
  WHERE
    method = 'PUT'
  ORDER BY json_extract_scalar(requestbody, '$.xxx')
\``,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: 'property not found requestbody - $.xxx',
          },
        },
      ],
    },
  ],
});
