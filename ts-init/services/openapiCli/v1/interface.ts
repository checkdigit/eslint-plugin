/* c8 ignore start */
// services/openapiCli/v1/interface.ts

import type * as types from './swagger';
import type { MappedResponse } from '../../index-fixture.ts';

/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

export interface RsaKeyPairPutTest<ResponseContext = types.RsaKeyPairPutResponseContext>
  extends Promise<MappedResponse<ResponseContext>> {
  send(body: types.RsaKeyPairPutRequestType['body']): this;
  set(headerName: keyof NonNullable<types.RsaKeyPairPutRequestContext['request']['headers']>, value: string): this;
  set(headers: Partial<types.RsaKeyPairPutRequestContext['request']['headers']>): this;

  expect<Status extends number>(
    status: Status,
  ): Status extends types.RsaKeyPairPutResponseOK['status']
    ? RsaKeyPairPutTest<types.RsaKeyPairPutResponseOK>
    : Status extends types.RsaKeyPairPutResponseConflict['status']
      ? RsaKeyPairPutTest<types.RsaKeyPairPutResponseConflict>
      : Status extends types.RsaKeyPairPutResponseDefault['status']
        ? RsaKeyPairPutTest<types.RsaKeyPairPutResponseDefault>
        : never;
  expect(checker: (res: Awaited<this>) => any): this;
  expect(
    headerName: ResponseContext extends { headers: unknown } ? keyof ResponseContext['headers'] : never,
    headerValue: string | RegExp,
  ): this;
  expect(body: string | RegExp | Object): this;
}
export interface PingGetTest<ResponseContext = types.PingGetResponseContext>
  extends Promise<MappedResponse<ResponseContext>> {
  set(headerName: string, value: string): this;
  set(headers: Record<string, string>): this;

  expect<Status extends number>(
    status: Status,
  ): Status extends types.PingGetResponseOK['status']
    ? PingGetTest<types.PingGetResponseOK>
    : Status extends types.PingGetResponseDefault['status']
      ? PingGetTest<types.PingGetResponseDefault>
      : never;
  expect(checker: (res: Awaited<this>) => any): this;
  expect(
    headerName: ResponseContext extends { headers: unknown } ? keyof ResponseContext['headers'] : never,
    headerValue: string | RegExp,
  ): this;
  expect(body: string | RegExp | Object): this;
}

export interface Api {
  put(url: `/sample/v1/tenant/${string}/rsa-key-pair/${string}`): RsaKeyPairPutTest;

  get(url: `/sample/v1/ping`): PingGetTest;
}

/* eslint-enable */

/* c8 ignore stop */
