/* c8 ignore start */
// api/v1/swagger.ts
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

export interface Conflict {}

/**
 * Server error message
 */
export interface Error extends NotErrorInstanceLike {
  message?: string;
  code:
    | 'INVALID_AT'
    | 'INVALID_FROM'
    | 'INVALID_TO'
    | 'TO_LESS_THAN_FROM'
    | 'HASH_MISMATCH'
    | 'INVALID_SCHEMA'
    | 'SCHEMA_VALIDATION_FAILURE'
    | 'INVALID_JSON'
    | 'INVALID_JSON_OBJECT'
    | 'INVALID_ENCRYPTED_DATA'
    | 'INVALID_KEY'
    | 'KEY_MISMATCH'
    | 'INVALID_PUBLIC_KEY_ID'
    | 'INVALID_IF_MATCH'
    | 'INVALID_CREATED_ON'
    | 'INVALID_TENANT_ID'
    | 'INVALID_ID';
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
  body: /* Server error message */ Error;
}
export interface PingGetResponseOK {
  status: 200;
  headers: LowercaseKeys<PingGetResponseOKHeaders>;
  body: Ping;
}
export interface PingGetResponseOKHeaders {
  'Created-On': string; // date-time
}
/**
 * Public key in PEM format
 */
export type PublicKey = string;
/**
 * Request to generate an RSA key-pair
 */
export interface RSAKeyPairRequest {
  transmissionKey: /* Public key in PEM format */ PublicKey;
}
/**
 * Encrypted RSA key-pair
 */
export interface RSAKeyPairResponse {
  /**
   * AES-256-CBC secret key data encrypted with the request tranmissionKey, encoded using base-64
   */
  transmissionSecretKey: string;
  publicKey: /* Public key in PEM format */ PublicKey;
  /**
   * Private key part of generated RSA key pair, encrypted with transmissionSecretKey and base-64 encoded
   */
  encryptedPrivateKey: string;
}
export interface RsaKeyPairPutContext {
  request: RsaKeyPairPutRequestType;
  params: {
    tenantId: string;
    rsaKeyPairId: string;
  };
  response: RsaKeyPairPutResponseContext;
}
export interface RsaKeyPairPutRequestContext {
  request: RsaKeyPairPutRequestType;
  params: {
    tenantId: string;
    rsaKeyPairId: string;
  };
}
export interface RsaKeyPairPutRequestHeaders {
  'Created-On'?: string; // date-time
}
export interface RsaKeyPairPutRequestType extends InboundContext {
  headers?: LowercaseKeys<RsaKeyPairPutRequestHeaders>;
  body?: /* Request to generate an RSA key-pair */ RSAKeyPairRequest;
}
export interface RsaKeyPairPutResponseConflict {
  status: 409;
}
export type RsaKeyPairPutResponseContext =
  | RsaKeyPairPutResponseOK
  | RsaKeyPairPutResponseConflict
  | RsaKeyPairPutResponseDefault;
export interface RsaKeyPairPutResponseDefault {
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
  body: /* Server error message */ Error;
}
export interface RsaKeyPairPutResponseOK {
  status: 200;
  headers: LowercaseKeys<RsaKeyPairPutResponseOKHeaders>;
  body: /* Encrypted RSA key-pair */ RSAKeyPairResponse;
}
export interface RsaKeyPairPutResponseOKHeaders {
  'Created-On': string; // date-time
  'Updated-On'?: string; // date-time
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
