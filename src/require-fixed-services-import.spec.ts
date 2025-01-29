// require-fixed-services-import.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './require-fixed-services-import.ts';
import createTester from './ts-tester.test.ts';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'correctly import service typing',
      code: `import type { ledgerV1 as ledger } from '../../services';`,
    },
    {
      name: 'correctly import service typing - with deeper path',
      code: `import type { ledgerV1 as ledger } from '../../services/index';`,
    },
    {
      name: 'correctly import service typing - with deeper path and ts extension',
      code: `import type { ledgerV1 as ledger } from '../../services/index.ts';`,
    },
    {
      name: 'correctly import service typing - with multiple imports',
      code: `import type { ledgerV1 as ledger, linkV1 as link } from '../../services/index.ts';`,
    },
  ],
  invalid: [
    {
      name: 'update service typing import from',
      code: `import type { personV1 as person } from '../../services/person';`,
      output: `import type { personV1 as person } from '../../services/index.ts';`,
      errors: [{ messageId: 'updateServicesImportSource' }],
    },
    {
      name: 'update service typing import from - with deeper path',
      code: `import type { personV1 as person } from '../../services/person/index';`,
      output: `import type { personV1 as person } from '../../services/index.ts';`,
      errors: [{ messageId: 'updateServicesImportSource' }],
    },
    {
      name: 'update service typing import from - with deeper path and ts extension',
      code: `import type { personV1 as person } from '../../services/person/index.ts';`,
      output: `import type { personV1 as person } from '../../services/index.ts';`,
      errors: [{ messageId: 'updateServicesImportSource' }],
    },
    {
      name: 'update service typing import from a particular version, and rename the references',
      code: `
        import type { Person } from '../../services/person/v1';
        import type { Address } from '../../services/address/v2';
        const person: Person = { id: '1', name: 'John Doe' };
        const person2 = { id: '1', name: 'John Doe' } as Person;
        async function createPerson(input: Person): Promise<Person> {
          const person3 = {} as Person
          const address: Address = {} as Address
        }
      `,
      output: `
        import type { personV1 as person } from '../../services/index.ts';
        import type { addressV2 as address } from '../../services/index.ts';
        const person: person.Person = { id: '1', name: 'John Doe' };
        const person2 = { id: '1', name: 'John Doe' } as person.Person;
        async function createPerson(input: person.Person): Promise<person.Person> {
          const person3 = {} as person.Person
          const address: address.Address = {} as address.Address
        }
      `,
      errors: [
        { messageId: 'updateServicesImportSpecifier' },
        { messageId: 'updateServicesImportSource' },
        { messageId: 'updateServicesImportSpecifier' },
        { messageId: 'updateServicesImportSource' },
        { messageId: 'renameServiceTypeReference' },
        { messageId: 'renameServiceTypeReference' },
        { messageId: 'renameServiceTypeReference' },
        { messageId: 'renameServiceTypeReference' },
        { messageId: 'renameServiceTypeReference' },
        { messageId: 'renameServiceTypeReference' },
        { messageId: 'renameServiceTypeReference' },
      ],
    },
    {
      name: 'update service typing import from a particular version - match/rename based on local name instead of imported name',
      code: `
        import type { Person as P } from '../../services/person/v1';
        const person = {} as P;
      `,
      output: `
        import type { personV1 as person } from '../../services/index.ts';
        const person = {} as person.Person;
      `,
      errors: [
        { messageId: 'updateServicesImportSpecifier' },
        { messageId: 'updateServicesImportSource' },
        { messageId: 'renameServiceTypeReference' },
      ],
    },
  ],
});
