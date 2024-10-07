/* c8 ignore start */
// services/checkdigit/openapi-cli/v1/interface.d.ts

/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

import type { MappedRequestBody, MappedRequestHeaders, MappedResponse, CaseInsensitive } from '../../../index';
import type * as types from './swagger';

declare global {
  function fetch<Context extends types.RsaKeyPairPutContext>(
    url: `https://openapi-cli.checkdigit/sample/v1/tenant/${string}/rsa-key-pair/${string}`,
    init: Omit<RequestInit, 'body' | 'method' | 'headers'> & {
      method: CaseInsensitive<'PUT'>;
    } & MappedRequestHeaders<Context['request']['headers']> &
      MappedRequestBody<Context['request']['body']>,
  ): Promise<MappedResponse<Context['response']>>;

  function fetch<Context extends types.PingGetContext>(
    url: `https://openapi-cli.checkdigit/sample/v1/ping`,
    init?: Omit<RequestInit, 'body' | 'method' | 'headers'> & {
      method?: CaseInsensitive<'GET'>;
    } & MappedRequestHeaders<{} | undefined>,
  ): Promise<MappedResponse<Context['response']>>;
}

/* eslint-enable */

/* c8 ignore stop */
