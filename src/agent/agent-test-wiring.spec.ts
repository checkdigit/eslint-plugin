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
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';

describe('/ping', () => {
  awsNock();
  const fixture = createFixture(amazonSetup);

  beforeAll(async () => {
    await fixture.reset();
  }, 15_000);

  it('returns current server time', async () => {
    //
  });
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';

describe('/ping', () => {
  awsNock();
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

  it('returns current server time', async () => {
    //
  });
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - function reference instead of arrow function',
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';

describe('/ping', () => {
  awsNock();
  const fixture = createFixture(amazonSetup);

  beforeAll(fixture.reset);

  it('returns current server time', async () => {
    //
  });
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';

describe('/ping', () => {
  awsNock();
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

  it('returns current server time', async () => {
    //
  });
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - function call instead of block - async',
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';

describe('/ping', () => {
  awsNock();
  const fixture = createFixture(amazonSetup);

  beforeAll(async () => fixture.reset());

  it('returns current server time', async () => {
    //
  });
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';

describe('/ping', () => {
  awsNock();
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

  it('returns current server time', async () => {
    //
  });
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
    {
      name: 'update test wiring - function call instead of block - not async',
      code: `
import { beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';

describe('/ping', () => {
  awsNock();
  const fixture = createFixture(amazonSetup);

  beforeAll(() => fixture.reset());

  it('returns current server time', async () => {
    //
  });
});
      `,
      output: `
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

import { amazonSetup } from '@checkdigit/amazon';
import awsNock from '@checkdigit/aws-nock';
import { createFixture } from '@checkdigit/fixture';

import { BASE_PATH } from './index';
import createAgent, { type Agent } from '@checkdigit/agent';
import fixturePlugin from '../../plugin/fixture.test';

describe('/ping', () => {
  awsNock();
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

  it('returns current server time', async () => {
    //
  });
});
      `,
      errors: [{ messageId: 'updateTestWiring' }],
    },
  ],
});
