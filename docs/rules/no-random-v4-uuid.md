# When generating v4 random, this is a code smell and always leads to idempotency problems in code. Avoid this and use other alternative versions of uuids

## Fail

```js
import { v4 } from 'uuid';
const newUuid = v4();
```

## Pass

```js
import uuid from 'uuid';
const id = uuid.v1();
```
