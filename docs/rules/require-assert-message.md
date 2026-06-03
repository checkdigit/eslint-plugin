# Make sure message argument is always supplied to node:assert methods

## Fail

```js
assert('val1');
assert.doesNotReject(async () => {
  const result = await resolvePromise();
}, Error);
assert.doesNotMatch(test, /\W/gu);
```

## Pass

```js
assert.ok(statusCode === StatusCodes.OK, 'Failed to get data.');
assert.equal('val1', 'val1', 'Both are different values');
```
