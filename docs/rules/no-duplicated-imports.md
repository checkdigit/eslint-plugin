# import statement from the same module should be merged into a single import statement

## Fail

```js
import { ValueOne } from 'abc';
import { ValueTwo } from 'abc';
```

## Pass

```js
import { ValueOne, ValueTwo } from 'abc';
```