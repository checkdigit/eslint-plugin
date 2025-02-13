// athena.spec.ts

import rule, { ruleId } from './athena';

import createTester from './ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'not a sql',
      code: `const foo = \`bar\``,
    },
    {
      name: 'not SELECT or WITH sql',
      code: `const sql = \`drop table foo\``,
    },
    {
      name: 'SELECT without FROM',
      code: `const sql = \`select 1\``,
    },
    {
      name: 'good sql',
      code: `const sql = \`select * from message\``,
    },
    {
      name: 'good sql using WITH',
      code: `const sql = \`WITH m AS (select * from message) select requestbody from m\``,
    },
    {
      name: 'parse function expression with array access - in column',
      code: `const sql = \`WITH m AS (select * from message) 
        select DISTINCT split(url, '/') [1] as messageId FROM m\``,
    },
    {
      name: 'parse JSON property access - in column',
      code: `const sql = \`select posting['amount'] FROM m\``,
    },
    {
      name: 'parse function expression with array access - in condition',
      code: `const sql = \`SELECT * FROM person WHERE url[4] = 'person'\``,
    },
    {
      name: 'parse function expression with array access - in condition',
      code: `const sql = \`SELECT * FROM person WHERE split(url, '/') [4] = 'person'\``,
    },
  ],
  invalid: [
    {
      name: 'invalid sql',
      code: `const sql = \`select foo as bar ffrom message\``,
      errors: [
        {
          messageId: 'SyntextError',
        },
      ],
    },
  ],
});
