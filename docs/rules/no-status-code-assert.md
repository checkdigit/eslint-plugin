# Disallow the use of `statusCode` as a parameter in assert.

## Fail

```js
assert(statusCode === StatusCodes.OK);
assert.equal(statusCode, StatusCodes.OK);
assert(response.status === 200);
assert.equal(response.status, 200);
```

## Pass

```js
assert(response.otherProperty === 'test');
```
