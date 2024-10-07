# For type only import declaration statement, the `type` should be put outside of the curly braces of the import specifiers.

## Fail

```js
import { type foo } from 'one'; // results in import from 'bar' in compiled output
import { type bar, type baz } from 'two';  // also results in import from 'bar' in compiled output
```

## Pass

```js
import type { foo } from 'one'; // is removed from compiled output
import type { bar, baz } from 'two'; // is removed from compiled output
```
