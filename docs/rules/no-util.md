# Detects if file name is util or any files under util directory and if so, it will throw an error

## Fail

```js
// filename: util.ts
// filename: src/util.ts
// filename: /util.spec.ts
// filename: util.test.ts
// filename: util-test.ts
// filename: test-util.ts
// filename: /util/test-Util.ts
// filename: /util/test-util.ts
// filename: /util/util-Test.ts
// filename: /util/utility-Test.ts
// filename: /src/test-util.ts
```

## Pass

```js
// filename: hello.ts
// filename: testUtil.ts
// filename: utilTest.ts
// filename: /src/test-utility.ts
// filename: test-utility.ts
```
