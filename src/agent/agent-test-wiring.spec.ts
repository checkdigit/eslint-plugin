// agent/agent-test-wiring.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import rule, { ruleId } from './agent-test-wiring';
import createTester from '../ts-tester.test';

createTester().run(ruleId, rule, {
  valid: [],
  invalid: [
    {
      name: 'update test wiring',
      code: `
import { strict as assert } from 'node:assert';

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
import { strict as assert } from 'node:assert';

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
  ],
});
