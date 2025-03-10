# When generating v4 random, crypto.randomUUID in prod this is a code smell and always leads to idempotency problems in code. Avoid this and use other alternative versions of uuids

## Fail

```js
import { v4 } from 'uuid'; // prod
const newUuid = v4();

import { randomUUID } from 'node:crypto'; // prod
const id = randomUUID();

const id = crypto.randomUUID(); // prod
```

## Pass

```js
import uuid from 'uuid';
const id = uuid.v1();

import { randomBytes } from 'node:crypto';
const id = randomBytes(16);
```
