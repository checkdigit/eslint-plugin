# This rule is to ensure that no side effects can occur at the module-level only if exporting module

# These variable declarations, control flows and others - var, let, if, switch, for, while, do, await, try are considered to be side effects at the module level along with function calls, expressions

## Fail

```js
let y = 20;
var x = 10;
if (x > y) {
  y = x;
} else {
  y = 30;
}
switch (y) {
  case 10:
    break;
  default:
    return;
}
try {
  object.prop = 'bar';
} catch (error) {
  console.error(error);
}
async function myAsyncFunction() {
  await Promise.resolve();
}
const test = newTest();
export default function myFunction() {
  // function body
}
```

## Pass

```js
const x = 10;
const log = debug('report:event');
Symbol.for('foo');
const object = { prop: 'foo' };
Object.freeze(object);
```
