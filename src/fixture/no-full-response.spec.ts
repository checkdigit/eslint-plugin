// fixture/no-full-response.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './no-full-response';
import { RuleTester } from '@typescript-eslint/rule-tester';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: '../tsconfig.json',
    tsconfigRootDir: `${process.cwd()}/ts-init`,
  },
});

ruleTester.run(ruleId, rule, {
  valid: [],
  invalid: [
    {
      name: 'remove type annotation from variable declaration',
      code: `const responses: FullResponse<unknown> = await fixture.api.put('\${BASE_PATH}/ping').send(testCard);`,
      output: `const responses = await fixture.api.put('\${BASE_PATH}/ping').send(testCard);`,
      errors: [{ messageId: 'removeFullResponse' }],
    },
    {
      name: 'remove type annotation from array variable declaration',
      code: `
        const results: FullResponse<unknown>[] = await Promise.all([
          fetch(\`\${BASE_PATH}/ping\`),
          fetch(\`\${BASE_PATH}/ping\`)
        ]);
      `,
      output: `
        const results = await Promise.all([
          fetch(\`\${BASE_PATH}/ping\`),
          fetch(\`\${BASE_PATH}/ping\`)
        ]);
      `,
      errors: [{ messageId: 'removeFullResponse' }],
    },
    {
      name: 'remove type annotation from function return type',
      code: `
        export async function putPersonDataEncryptionKey(
          configuration: Configuration,
          inboundContext: InboundContext,
          dataEncryptionKeyId: string,
        ): Promise<FullResponse<unknown>> {
          const putDataEncryptionKeyResponse = await configuration.service
            .person(inboundContext)
            .put(\`/person/v1/data-encryption-key/\${dataEncryptionKeyId}\`, requestBody, {
              resolveWithFullResponse: true,
            });

          if (putDataEncryptionKeyResponse.statusCode === StatusCodes.OK) {
            return putDataEncryptionKeyResponse;
          }
          throw new Error(\`Error creating Person data encryption key \${dataEncryptionKeyId}. \`);
        }
      `,
      output: `
        export async function putPersonDataEncryptionKey(
          configuration: Configuration,
          inboundContext: InboundContext,
          dataEncryptionKeyId: string,
        ) {
          const putDataEncryptionKeyResponse = await configuration.service
            .person(inboundContext)
            .put(\`/person/v1/data-encryption-key/\${dataEncryptionKeyId}\`, requestBody, {
              resolveWithFullResponse: true,
            });

          if (putDataEncryptionKeyResponse.statusCode === StatusCodes.OK) {
            return putDataEncryptionKeyResponse;
          }
          throw new Error(\`Error creating Person data encryption key \${dataEncryptionKeyId}. \`);
        }
      `,
      errors: [{ messageId: 'removeFullResponse' }],
    },
    {
      name: 'remove type annotation from arrow function argument narrowing',
      code: `putResponses.map((putResponse: FullResponse<unknown>) => putResponse.statusCode)`,
      output: `putResponses.map((putResponse) => putResponse.statusCode)`,
      errors: [{ messageId: 'removeFullResponse' }],
    },
    {
      name: 'remove type annotation from "as" type narrowingF',
      code: `const fullResponse = response as FullResponse<unknown>;`,
      output: `const fullResponse = response;`,
      errors: [{ messageId: 'removeFullResponse' }],
    },
  ],
});
