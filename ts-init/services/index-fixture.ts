/* c8 ignore start */
// services/index-fixture.ts

/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

import type { pingApi } from './ping';
import type { openapiCliApi } from './openapiCli';

export interface InboundContext {
  get: (field: string) => string;
}
type FunctionFromRecord<T> = <K extends keyof T>(parameter: K) => T[K];

type MappedResponseHeaders<HeadersType> = undefined extends HeadersType
  ? {
      header: NonNullable<HeadersType>;
      headers: NonNullable<HeadersType>;
      get: FunctionFromRecord<NonNullable<HeadersType>>;
    }
  : {
      header: HeadersType;
      headers: HeadersType;
      get: FunctionFromRecord<HeadersType>;
    };

type MappedResponseBody<BodyType> = undefined extends BodyType
  ? {
      body: NonNullable<BodyType>;
    }
  : {
      body: BodyType;
    };

export interface ApiResponseContext {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Adding backward compatibility using mapped type
 * The existing codes might access certain properties available in Koa's Response which may be unavailable in ResponseContext (e.g. 'statusCode' vs. 'status')
 * The following mapped type create alias between the Koa's Response and ResponseContext.
 * More importantly it maintain both 'status' and 'statusCode' as discriminators to differentiate each corresponding ResponseContexts in the union-ed ResponseContext at the api operation level
 */
export type MappedResponse<ResponseContextUnion> = ResponseContextUnion extends infer ResponseContext
  ? ResponseContext extends ApiResponseContext
    ? {
        status: ResponseContext['status'];
        statusCode: ResponseContext['status'];
      } & MappedResponseHeaders<ResponseContext['headers']> &
        MappedResponseBody<ResponseContext['body']>
    : never
  : never;

export interface TypedServices {
  ping: (context: InboundContext) => pingApi;
  _main: openapiCliApi;
}

export type * from './ping';
export type * from './openapiCli';

/* eslint-enable */

/* c8 ignore stop */
