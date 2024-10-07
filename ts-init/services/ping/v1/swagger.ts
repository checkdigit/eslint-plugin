/* c8 ignore start */
// services/ping/v1/swagger.ts
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

export interface InboundContext {
  get(key: string): string;
}

export interface ApiResponseContext {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface KoaResponseContext {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  set(key: string, value: string): void;
}

export type LowercaseKeys<T> = {
  [K in keyof T as Lowercase<K & string>]: T[K];
};

type NotErrorInstanceLike = { stack?: never; cause?: never };

/**
 * Error message
 */
export interface Error extends NotErrorInstanceLike {
  message?: string;
  code?: string;
}
export interface Ping {
  /**
   * Current server time
   */
  serverTime: string; // date-time
}
export interface PingGetContext {
  request: PingGetRequestType;
  response: PingGetResponseContext;
}
export interface PingGetRequestContext {
  request: PingGetRequestType;
}
export interface PingGetRequestType extends InboundContext {}
export type PingGetResponseContext = PingGetResponseOK | PingGetResponseDefault;
export interface PingGetResponseDefault {
  status:
    | 100
    | 101
    | 102
    | 103
    | 201
    | 202
    | 203
    | 204
    | 205
    | 206
    | 207
    | 300
    | 301
    | 302
    | 303
    | 304
    | 305
    | 307
    | 308
    | 400
    | 401
    | 402
    | 403
    | 404
    | 405
    | 406
    | 407
    | 408
    | 409
    | 410
    | 411
    | 412
    | 413
    | 414
    | 415
    | 416
    | 417
    | 418
    | 419
    | 420
    | 421
    | 422
    | 423
    | 424
    | 426
    | 428
    | 429
    | 431
    | 451
    | 500
    | 501
    | 502
    | 503
    | 504
    | 505
    | 507
    | 511;
  body: /* Error message */ Error;
}
export interface PingGetResponseOK {
  status: 200;
  body: Ping;
}
export interface PingHeadContext {
  request: PingHeadRequestType;
  response: PingHeadResponseContext;
}
export interface PingHeadRequestContext {
  request: PingHeadRequestType;
}
export interface PingHeadRequestType extends InboundContext {}
export type PingHeadResponseContext = PingHeadResponseOK | PingHeadResponseDefault;
export interface PingHeadResponseDefault {
  status:
    | 100
    | 101
    | 102
    | 103
    | 201
    | 202
    | 203
    | 204
    | 205
    | 206
    | 207
    | 300
    | 301
    | 302
    | 303
    | 304
    | 305
    | 307
    | 308
    | 400
    | 401
    | 402
    | 403
    | 404
    | 405
    | 406
    | 407
    | 408
    | 409
    | 410
    | 411
    | 412
    | 413
    | 414
    | 415
    | 416
    | 417
    | 418
    | 419
    | 420
    | 421
    | 422
    | 423
    | 424
    | 426
    | 428
    | 429
    | 431
    | 451
    | 500
    | 501
    | 502
    | 503
    | 504
    | 505
    | 507
    | 511;
  body: /* Error message */ Error;
}
export interface PingHeadResponseOK {
  status: 200;
}

export function setResponse<ResponseContext extends Response, Response extends ApiResponseContext = ApiResponseContext>(
  response: Response,
  responseContext: ResponseContext,
): void {
  const koaResponse = response as unknown as KoaResponseContext;
  koaResponse.status = responseContext.status;
  if (responseContext.body) {
    if (responseContext.body instanceof globalThis.Error) {
      console.warn(
        `Error instance or complex object with non-enumerable properties should not be used as response body directly because it'll cause firehose data inconsistency. Please use plain object literal instead.`,
      );

      const error = responseContext.body as unknown as Error;
      const errorProperties: (keyof Error)[] = ['message', 'code'];
      const convertedError = Object.fromEntries(
        errorProperties
          .map((key) => (error[key] === undefined ? undefined : [key, error[key]]))
          .filter((entry) => entry !== undefined) as [string, unknown][],
      );
      console.warn('The provided Error instance has been converted as a plain object:', convertedError);
      koaResponse.body = convertedError;
    } else {
      koaResponse.body = responseContext.body;
    }
  }
  if (responseContext.headers) {
    for (const [key, value] of Object.entries(responseContext.headers)) {
      koaResponse.set(key, value);
    }
  }
}

/* eslint-enable */
/* c8 ignore stop */
