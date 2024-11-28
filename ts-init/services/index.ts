/* c8 ignore start */
// services/index.ts

export type Stringified<T> = string & { _: T };

interface ApiResponseContext {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type ExtensionHeaders = Record<`x-${string}`, string> & {
  'content-type'?: 'application/json';
};

export type MappedRequestHeaders<HeadersType> = undefined extends HeadersType
  ? {
      headers?: ExtensionHeaders & NonNullable<HeadersType>;
    }
  : {
      headers: ExtensionHeaders & HeadersType;
    };

export type MappedRequestBody<BodyType> = undefined extends BodyType
  ? {
      body?: Stringified<NonNullable<BodyType>>;
    }
  : {
      body: Stringified<BodyType>;
    };

type HeaderGetter<HeadersType extends Record<string, string | undefined>> = Omit<Headers, 'get'> & {
  get<HeaderName extends keyof HeadersType>(headerName: HeaderName): HeadersType[HeaderName];
};

export type MappedResponse<ResponseContextUnion> = ResponseContextUnion extends infer ResponseContext
  ? ResponseContext extends ApiResponseContext
    ? Omit<Response, 'status' | 'headers' | 'json'> & {
        readonly status: ResponseContext['status'];
        readonly headers: HeaderGetter<NonNullable<ResponseContext['headers']>>;
        json(): Promise<ResponseContext['body']>;
      }
    : never
  : never;

export type CaseInsensitive<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${CaseInsensitive<Rest>}` | `${Lowercase<First>}${CaseInsensitive<Rest>}`
  : '';

export type * from './checkdigit/ping/v2';
export type * from './checkdigit/ping/v1';
export type * from './checkdigit/openapi-cli/v1';

/* c8 ignore stop */
