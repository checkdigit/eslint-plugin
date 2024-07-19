# To ease the transition from fixture to native fetch API, this rule convert relevant code automatically.

## Before

```js
it('returns current server time', async () => {
  const response = await fixture.api.get(`/smartdata/v1/ping`).expect(StatusCodes.OK);
  const body = response.body;
  const timeDifference = Date.now() - new Date(body.serverTime).getTime();
  assert.ok(timeDifference >= 0 && timeDifference < 200);
});
```

## After

```js
it('returns current server time', async () => {
  // assume the existence of - const BASE_PATH = 'https://smartdata.checkdigit/smartdata/v1';
  const response = await fetch(`${BASE_PATH}/ping`);
  assert.equal(response.status, StatusCodes.OK);
  const body = await response.json();
  const timeDifference = Date.now() - new Date(body.serverTime).getTime();
  assert.ok(timeDifference >= 0 && timeDifference < 200);
});
```
