// src/agent/url.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from '@jest/globals';
import {
  addBasePathUrlDomain,
  isServiceApiCallUrl,
  replaceEndpointUrlPrefixWithBasePath,
  replaceEndpointUrlPrefixWithDomain,
} from './url';

describe('URL Utility Functions', () => {
  it('PLAIN_URL_REGEXP should match plain URLs - string', () => {
    const url = "'/service-name/v1/endpoint'";
    assert(isServiceApiCallUrl(url));
  });

  it('PLAIN_URL_REGEXP should match tokenized URLs - template literal', () => {
    const url = '`/service-name/v1/endpoint`';
    assert(isServiceApiCallUrl(url));
  });

  it('TOKENIZED_URL_REGEXP should match tokenized URLs - string', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const url = '`${BASE_PATH}/endpoint`';
    assert(isServiceApiCallUrl(url));
  });

  it('replaceEndpointUrlPrefixWithBasePath should replace URL prefix with BASE_PATH - string', () => {
    const url = "'/service-name/v1/endpoint'";
    // eslint-disable-next-line no-template-curly-in-string
    const expected = '`${BASE_PATH}/endpoint`';
    assert.equal(replaceEndpointUrlPrefixWithBasePath(url), expected);
  });

  it('replaceEndpointUrlPrefixWithBasePath should replace URL prefix with BASE_PATH - template literal', () => {
    const url = '`/service-name/v1/endpoint`';
    // eslint-disable-next-line no-template-curly-in-string
    const expected = '`${BASE_PATH}/endpoint`';
    assert.equal(replaceEndpointUrlPrefixWithBasePath(url), expected);
  });

  it('replaceEndpointUrlPrefixWithDomain should replace URL prefix with domain - string', () => {
    const url = "'/service-name/v1/endpoint'";
    const expected = "'https://service-name.checkdigit/service-name/v1/endpoint'";
    assert.equal(replaceEndpointUrlPrefixWithDomain(url), expected);
  });

  it('replaceEndpointUrlPrefixWithDomain should replace URL prefix with domain - template literal', () => {
    const url = '`/service-name/v1/endpoint`';
    const expected = '`https://service-name.checkdigit/service-name/v1/endpoint`';
    assert.equal(replaceEndpointUrlPrefixWithDomain(url), expected);
  });

  it('addBasePathUrlDomain should add domain to base path URL - string', () => {
    const url = "'/service-name/v1'";
    const expected = "'https://service-name.checkdigit/service-name/v1'";
    assert.equal(addBasePathUrlDomain(url), expected);
  });

  it('addBasePathUrlDomain should add domain to base path URL - template literal', () => {
    const url = '`/service-name/v1`';
    const expected = '`https://service-name.checkdigit/service-name/v1`';
    assert.equal(addBasePathUrlDomain(url), expected);
  });
});
