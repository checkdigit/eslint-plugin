/* c8 ignore start */
// services/checkdigit/ping/v1/interface.d.ts

/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

import type { MappedRequestBody, MappedRequestHeaders, MappedResponse, CaseInsensitive } from '../../../index';
import type * as types from './swagger';

declare global {
  function fetch<Context extends types.PingGetContext>(
    url: `https://ping.checkdigit/ping/v1/ping`,
    init?: Omit<RequestInit, 'body' | 'method' | 'headers'> & {
      method?: CaseInsensitive<'GET'>;
    } & MappedRequestHeaders<{} | undefined>,
  ): Promise<MappedResponse<Context['response']>>;

  function fetch<Context extends types.PingHeadContext>(
    url: `https://ping.checkdigit/ping/v1/ping`,
    init: Omit<RequestInit, 'body' | 'method' | 'headers'> & {
      method: CaseInsensitive<'HEAD'>;
    } & MappedRequestHeaders<{} | undefined>,
  ): Promise<MappedResponse<Context['response']>>;
}

/* eslint-enable */

/* c8 ignore stop */
