# Disallow the use of `as` type assertions and we suggest using `satisfies` instead to ensure that an expression conforms to a specific type without changing the type of the expression itself

## Fail

```ts
const events = request.body as TestEvent[];
const complexEvent = request.body as { type: string; payload: any };
```

## Pass

```ts
const newEvent = request.body satisfies AnotherEventType;
const complexEvent = request.body satisfies { type: string; payload: any };
```
