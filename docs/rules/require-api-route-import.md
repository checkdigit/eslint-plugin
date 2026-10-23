# Require every API route implementation to be imported by `src/api/v{N}/index.ts`

A route implementation (a `.ts` file directly inside `src/api/v{N}` that creates a `new Router(...)`) is only served once the folder's `index.ts` imports it and adds it to the `Service` list. Forgetting the import silently drops the new endpoint, so this rule reports the missing import in two places:

- in `index.ts`, once for every route implementation in the folder that it does not import;
- in the route implementation itself, on its `new Router(...)`, so the problem shows up in the file being worked on before the tests are run.

Folders without an `index.ts`, test files (`*.spec.ts`, `*.test.ts`), type declarations (`*.d.ts`), files in sub-folders and files that do not create a `Router` (e.g. `constants.ts`, `swagger.ts`) are ignored.

## Fail

```ts
// src/api/v1/index.ts — `src/api/v1/transfer-get.ts` exists but is not imported
import type { Service } from '@checkdigit/serve-runtime';

import ping from './ping.ts';

const service: Service = async () => [ping];

export default service;
```

```ts
// src/api/v1/transfer-get.ts — reported on `new Router()` because `src/api/v1/index.ts` does not import this file
import Koa from 'koa';
import Router from '@koa/router';

export default async function () {
  const router = new Router();
  // ...
  return new Koa().use(router.routes()).use(router.allowedMethods());
}
```

## Pass

```ts
// src/api/v1/index.ts
import type { Service } from '@checkdigit/serve-runtime';

import ping from './ping.ts';
import transferGet from './transfer-get.ts';

const service: Service = async () => [ping, transferGet];

export default service;
```
