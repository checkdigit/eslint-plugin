# service typing import is restricted to be from `src/services' and not deeper

## Fail

```js
import type { personV1 as person } from '../../services/person'
```

## Pass

```js
import type { personV1 as person } from '../../services'
```
