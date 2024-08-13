# To be consistent for the handling of Promise instances, please replace the usage of the methods like `then`/`catch`/`finally` with `await` or regular try/catch/finally block respectively.

## Fail

```js
cli()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error: unknown) => {
    console.error('cli error:', error);
    process.exitCode = 1;
  });
```

## Pass

```js
try {
  await cli();
  process.exitCode = 0;
} catch (error) {
  console.error('cli error:', error);
  process.exitCode = 1;
}
```
