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
      code: `\`select * from message\``,
    },
    {
      name: 'SELECT with FROM - table name with single quotes',
      code: `\`select * from 'message'\``,
    },
    {
      name: 'SELECT with FROM - table name with double quotes',
      code: `\`select * from "message"\``,
    },
    {
      name: 'SELECT with FROM - table name with underscores',
      code: `\`select * from foo_bar\``,
    },
    {
      name: 'table name alias',
      code: `\`select m.url from message as m\``,
    },
    {
      name: 'using WITH',
      code: `\`WITH m AS (select * from message) select requestbody from m\``,
    },
    {
      name: 'parse function expression with array access - in column',
      code: `\`WITH m AS (select * from message) 
        select DISTINCT split(url, '/') [1] as messageId FROM m\``,
    },
    {
      name: 'parse JSON property access - in column',
      code: `\`select posting['amount'] FROM m\``,
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
      code: `\`SELECT student, score
        FROM tests
        CROSS JOIN UNNEST(scores) AS t (score);
        \``,
    },
    {
      name: 'complex query',
      code: `\`SELECT
        DISTINCT split(url, '/') [5] AS linkedCardId,
        split(url, '/') [7] AS linkedCardHolderId,
        json_extract_scalar(responseheaders, '$["XXXcreated-on"]') AS linkCreatedOn
      FROM
        link
      WHERE
        split(url, '/') [6] = 'card.hasProfile'
        AND cardinality(split(url, '/')) = 7
        AND method = 'PUT'
        AND responsestatus = '204'\``,
      only: true,
    },
  ],
  invalid: [
    {
      name: 'invalid sql',
      code: `\`select foo as bar ffrom message\``,
      errors: [
        {
          messageId: 'SyntextError',
        },
      ],
    },
  ],
});
