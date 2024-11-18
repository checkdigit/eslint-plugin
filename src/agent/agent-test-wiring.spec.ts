// agent/agent-test-wiring.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import createTester from '../ts-tester.test';
import rule, { ruleId } from './agent-test-wiring';

createTester().run(ruleId, rule, {
  valid: [
    {
      name: 'no test wiring needed',
      code: `
describe('/ping', () => {
  beforeAll(async () => {
    //
  });

  it('test something', async () => {
    //
  });
});
      `,
    },
  ],
  invalid: [
    {
      name: 'update test wiring - async arrow function with body block',
      filename: `src/api/v1/ping.spec.ts`,
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  beforeAll(async () => {
    await fixture.reset();
  }, 15_000);
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  let agent: Agent;
beforeAll(async () => {
    agent = await createAgent();
agent.register(await fixturePlugin(fixture));
agent.enable();
await fixture.reset();
  }, 15_000);
afterAll(async () => {
await agent[Symbol.asyncDispose]();
});
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - function reference instead of arrow function',
      filename: `src/api/v1/ping.spec.ts`,
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  beforeAll(fixture.reset);
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  let agent: Agent;
beforeAll(async () => {
agent = await createAgent();
agent.register(await fixturePlugin(fixture));
agent.enable();
await fixture.reset();
});
afterAll(async () => {
await agent[Symbol.asyncDispose]();
});
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - function call instead of block - async',
      filename: `src/api/v1/ping.spec.ts`,
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  beforeAll(async () => fixture.reset());
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  let agent: Agent;
beforeAll(async () => {
agent = await createAgent();
agent.register(await fixturePlugin(fixture));
agent.enable();
await fixture.reset();
});
afterAll(async () => {
await agent[Symbol.asyncDispose]();
});
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - function call instead of block - not async',
      filename: `src/api/v1/ping.spec.ts`,
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  beforeAll(() => fixture.reset());
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  let agent: Agent;
beforeAll(async () => {
agent = await createAgent();
agent.register(await fixturePlugin(fixture));
agent.enable();
await fixture.reset();
});
afterAll(async () => {
await agent[Symbol.asyncDispose]();
});
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - deeper folder structure',
      filename: `src/api/v1/test/util.spec.ts`,
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  beforeAll(() => fixture.reset());
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../../plugin/fixture.test';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  let agent: Agent;
beforeAll(async () => {
agent = await createAgent();
agent.register(await fixturePlugin(fixture));
agent.enable();
await fixture.reset();
});
afterAll(async () => {
await agent[Symbol.asyncDispose]();
});
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - shallower folder structure',
      filename: `src/service/pgp.spec.ts`,
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  beforeAll(() => fixture.reset());
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../plugin/fixture.test';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  let agent: Agent;
beforeAll(async () => {
agent = await createAgent();
agent.register(await fixturePlugin(fixture));
agent.enable();
await fixture.reset();
});
afterAll(async () => {
await agent[Symbol.asyncDispose]();
});
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'only beforeEach is presented',
      filename: `src/api/v1/ping.spec.ts`,
      code: `
import { beforeEach, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  beforeEach(() => fixture.reset());
});
      `,
      output: `
import { afterAll, beforeAll, beforeEach, describe, it } from '@jest/globals';
import { amazonSetup } from '@checkdigit/amazon';
import { createFixture } from '@checkdigit/fixture';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';
describe('/ping', () => {
  const fixture = createFixture(amazonSetup);
  let agent: Agent;
beforeAll(async () => {
agent = await createAgent();
agent.register(await fixturePlugin(fixture));
agent.enable();
});
beforeEach(() => fixture.reset());
afterAll(async () => {
await agent[Symbol.asyncDispose]();
});
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
  ],
});
