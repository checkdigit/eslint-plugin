# When handling response from service warpper, the response status code should always be asserted before accessing the response body. In order to do this, resolveWithFullResponse should be set as `true` as part of the service wrapper's options parameter.

## Fail

```js
const responseBody = await pingService.get(`${PING_BASE_PATH}/ping`) as Ping;
```

## Pass

```js
const response = await pingService.get(`${PING_BASE_PATH}/ping`);
assert.equal(response.status, StatusCodes.OK);
const responseBody: Ping = response.body
```
