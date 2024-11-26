# Disallow the use of `statusCode` as a parameter in assert.

## Fail

```js
assert(statusCode === 200);
assert.equal(statusCode, 200);
```

## Pass

```js
assert(response.status === 200);
assert.equal(response.status, 200);
```
