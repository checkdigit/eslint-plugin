// no-legacy-service-typing.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from './ts-tester.test.ts';
import rule, { ruleId } from './no-legacy-service-typing.ts';

createTester().run(ruleId, rule, {
  valid: [],
  invalid: [
    {
      name: 'report type annotation from variable declaration',
      code: `const responses: FullResponse<unknown> = await fixture.api.put('\${BASE_PATH}/ping').send(testCard);`,
      errors: [{ messageId: 'noLegacyServiceTyping' }],
    },
    {
      name: 'report type annotation from array variable declaration',
      code: `
        const results: FullResponse<unknown>[] = await Promise.all([
          fetch(\`\${BASE_PATH}/ping\`),
          fetch(\`\${BASE_PATH}/ping\`)
        ]);
      `,
      errors: [{ messageId: 'noLegacyServiceTyping' }],
    },
    {
      name: 'report type annotation from function return type',
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
      errors: [{ messageId: 'noLegacyServiceTyping' }],
    },
    {
      name: 'report type annotation from arrow function argument narrowing',
      code: `putResponses.map((putResponse: FullResponse<unknown>) => putResponse.statusCode)`,
      errors: [{ messageId: 'noLegacyServiceTyping' }],
    },
    {
      name: 'report type annotation from "as" type narrowing',
      code: `const fullResponse = response as FullResponse<unknown>;`,
      errors: [{ messageId: 'noLegacyServiceTyping' }],
    },
    {
      name: 'report Endpoint similar to FullResponse',
      code: `const service: Endpoint = someDependentService;`,
      errors: [{ messageId: 'noLegacyServiceTyping' }],
    },
  ],
});
