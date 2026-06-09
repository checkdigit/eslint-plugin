// athena/sql-file.spec.ts

import { RuleTester } from '@typescript-eslint/rule-tester';

import { parseForESLint } from '../sql-parser.ts';
import rule, { ruleId } from './sql-file.ts';

// The code in each test case is the raw SQL text — the entire "file" content.
// Column offsets are 1-based. Because there is no wrapping backtick (unlike the
// athena rule tests), every column is 1 lower than the equivalent athena.spec.ts case.
const tester = new RuleTester({
  languageOptions: {
    parser: { parseForESLint },
  },
});

tester.run(ruleId, rule, {
  valid: [
    {
      name: 'non-sql content is silently skipped',
      code: `DROP TABLE foo`,
    },
    {
      name: 'SELECT without FROM is silently skipped',
      code: `select 1`,
    },
    {
      name: 'SELECT star from known service',
      code: `select * from link`,
    },
    {
      name: 'SELECT specific column from known service',
      code: `select url from link`,
    },
    {
      name: 'table name alias',
      code: `select m.url from link as m`,
    },
    {
      name: 'quoted table name',
      code: `select * from "payment-card" where method = 'PUT'`,
    },
    {
      name: 'WITH / CTE',
      code: `WITH m AS (select * from link) select requestbody from m`,
    },
    {
      name: 'multi-line query',
      code: `SELECT
  url
FROM link
WHERE method = 'PUT'`,
    },
    {
      name: 'different aliases for same service table can be joined together and accessed in SELECT',
      code: `SELECT tcm.url, tcmch.url
FROM "teampay-card-management" AS tcm,
     "teampay-card-management" AS tcmch
WHERE tcm.method = 'PUT'
  AND cardinality(split(tcm.url, '/')) = 5
  AND split(tcm.url, '/')[4] = 'card'
  AND tcm.responsestatus = '200'
  AND split(tcmch.url, '/')[4] = 'cardholder'
  AND cardinality(split(tcmch.url, '/')) = 5
  AND tcmch.responsestatus = '200'
  AND tcmch.method = 'PUT'`,
    },
  ],

  invalid: [
    {
      // PEG parser rejects "when"; the error is on line 1.
      name: 'invalid SQL syntax reports a SyntextError',
      code: `select foo as bar from link when 1=1`,
      errors: [
        {
          messageId: 'SyntextError',
          data: { errorMessage: 'Expected [A-Za-z0-9_] but " " found.' },
          line: 1,
        },
      ],
    },
    {
      // Multi-line: PEG error is on line 4; location mapping must not collapse to line 1.
      name: 'syntax error location resolves to the offending line, not line 1',
      code: `SELECT
  foo AS bar
FROM link
WHEN 1=1`,
      errors: [
        {
          messageId: 'SyntextError',
          line: 4,
        },
      ],
    },
    {
      // "non-existent" starts at SQL offset 16 (after "SELECT url FROM ").
      // offsetToLoc → 0-based col 16 → 1-based col 17.
      // End: offset 30 → 0-based col 30 → 1-based col 31.
      name: 'unknown service reports AthenaError at the table name location',
      code: `SELECT url FROM "non-existent"`,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: 'service not found: "non-existent" (no swagger schema located)' },
          line: 1,
          column: 17,
          endLine: 1,
          endColumn: 31,
        },
      ],
    },
    {
      // "foo" starts at SQL offset 7 (after "select ").
      // offsetToLoc → 0-based col 7 → 1-based col 8.
      // End: offset 10 → 0-based col 10 → 1-based col 11.
      name: 'unknown column reports AthenaError at the column_ref location',
      code: `select foo from link`,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage:
              "can't found column foo in tables: link; available columns: method, started, ended, url, requestbody, requestheaders, responsestatus, responsemessage, responsetype, responsebody, responseheaders, partition_date",
          },
          line: 1,
          column: 8,
          endLine: 1,
          endColumn: 11,
        },
      ],
    },
    {
      name: 'unknown column in WITH outer SELECT',
      code: `WITH m AS (SELECT url FROM link WHERE method = 'PUT') SELECT nonExistentCol FROM m`,
      errors: [
        {
          messageId: 'AthenaError',
          data: {
            errorMessage: "can't found column nonExistentCol in tables: m; available columns: url",
          },
        },
      ],
    },
    {
      name: 'unknown table alias in SELECT',
      code: `SELECT x.url FROM link WHERE method = 'PUT'`,
      errors: [
        {
          messageId: 'AthenaError',
          data: { errorMessage: `unknown table or alias 'x'; known tables: link` },
        },
      ],
    },
  ],
});
