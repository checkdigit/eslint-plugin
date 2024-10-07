/* c8 ignore start */
// services/ping/v2/interface.ts

import type { MappedResponse } from '../../index-fixture.ts';
import type * as types from './swagger';

/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

export interface Api {
  get(
    url: `/ping/v2/ping`,

    options?: {
      resolveWithFullResponse: false;
      headers?: Record<string, string>;
    },
  ): Promise<types.PingGetResponseOK['body'] | types.PingGetResponseDefault['body']>;

  get(
    url: `/ping/v2/ping`,

    options?: {
      resolveWithFullResponse: true;
      headers?: Record<string, string>;
    },
  ): Promise<MappedResponse<types.PingGetResponseContext>>;

  head(
    url: `/ping/v2/ping`,

    options?: {
      resolveWithFullResponse: false;
      headers?: Record<string, string>;
    },
  ): Promise<types.PingHeadResponseDefault['body']>;

  head(
    url: `/ping/v2/ping`,

    options?: {
      resolveWithFullResponse: true;
      headers?: Record<string, string>;
    },
  ): Promise<MappedResponse<types.PingHeadResponseContext>>;
}

/* eslint-enable */

/* c8 ignore stop */
