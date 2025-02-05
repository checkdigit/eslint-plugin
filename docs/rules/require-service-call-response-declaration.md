# Any awaited service call should has a variable declared for it, so that its response status etc. can be checked upon in order to make sure that the result is as expected.

## Fail

```js
// fetch service call
await fetch(`https://ping.checkdigit/ping/v1/ping`);

// service wrapper call
await pingService.get(`/ping/v1/ping`, { resolveWithFullResponse: true });
```

## Pass

```js
// fetch service call
const pingResponse = await fetch(`https://ping.checkdigit/ping/v1/ping`);
if (pingResponse.status !== StatusCodes.OK) {
  // do something
}

// service wrapper call
const anotherPingResponse = await pingService.get(`/ping/v1/ping`, { resolveWithFullResponse: true });
if (anotherPingResponse.status === StatusCodes.NOT_FOUND) {
  // do something else
}
```
