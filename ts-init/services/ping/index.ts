/* c8 ignore start */
// services/ping/index.ts

import type * as v1 from './v1';
import type * as v2 from './v2';

export type pingApi = v1.Api & v2.Api;

export type * as pingV1 from './v1';
export type * as pingV2 from './v2';

/* c8 ignore stop */
