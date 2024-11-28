/* c8 ignore start */
// services/typing.d.ts

import type { Stringified } from '.';

declare global {
  interface JSON {
    stringify<T>(input: T): Stringified<T>;
  }
}

/* c8 ignore stop */
