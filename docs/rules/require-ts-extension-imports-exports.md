# Ensure .ts extension is at the end of all imports

This rule enforces that all import paths in TypeScript files end with the `.ts` extension.
With Node.js 22, the behavior for resolving module paths has changed to be more strict.
You need to include the `.ts` extension explicitly when importing TypeScript files properly.

## Fail

```js
import foo from './bar';
export { foo } from './bar';
```

## Pass

```js
import foo from './bar.ts';
export { foo } from './bar.ts';
```
