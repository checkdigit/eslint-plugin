import plugin, {CARD_NUMBER_FOUND, CARD_NUMBERS_FOUND} from '../';

const {RuleTester} = require('eslint/lib/rule-tester');
const rule = plugin.rules['no-card-numbers'];
const ruleTester = new RuleTester({ env: { es6: true } });

const CARD_NUMBER_FOUND_MSG = {
  messageId: CARD_NUMBER_FOUND
};

const CARD_NUMBERS_FOUND_MSG = {
  messageId: CARD_NUMBERS_FOUND
};

const STRING_TEST = `
const NOT_A_SECRET = "I'm not a secret, I think";
`;

const TEMPLATE_TEST = "const NOT_A_SECRET = `A template that isn't a secret. ${1+1} = 2`";

const CONTAINS_CARD_NUMBER_IN_STRING = `
const foo = 4507894813950280;
`;

const CONTAINS_SEVERAL_CARD_NUMBERS_IN_STRING = `
const foo = '4507894813950280 aa 4939816588221579';
`;

const CONTAINS_CARD_NUMBER_IN_COMMENT = `
// this test will be using this valid card number -> 4507894813950280
const foo = 'nothing wrong here';
`;

const CONTAINS_SEVERAL_CARD_NUMBERS_IN_COMMENT = `
// this test will be using these valid card numbers -> 4507894813950280 and 4732643354095204
const foo = 'nothing wrong here';
`;

const STRING_WITH_CARD_NUMBER_THAT_DOESNT_PASS_LUHN_CHECK = `
  const foo = 4507894813950285;
`;

ruleTester.run('no-card-numbers', rule, {
  valid: [
    {
      code: STRING_TEST
    },
    {
      code: TEMPLATE_TEST
    },
    {
      code: STRING_WITH_CARD_NUMBER_THAT_DOESNT_PASS_LUHN_CHECK
    }
  ],
  invalid: [
    {
      code: CONTAINS_CARD_NUMBER_IN_STRING,
      errors: [CARD_NUMBER_FOUND_MSG]
    },
    {
      code: CONTAINS_SEVERAL_CARD_NUMBERS_IN_STRING,
      errors: [CARD_NUMBERS_FOUND_MSG]
    },
    {
      code: CONTAINS_CARD_NUMBER_IN_COMMENT,
      errors: [CARD_NUMBER_FOUND_MSG]
    },
    {
      code: CONTAINS_SEVERAL_CARD_NUMBERS_IN_COMMENT,
      errors: [CARD_NUMBERS_FOUND_MSG]
    }
  ]
});
