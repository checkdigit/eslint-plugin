# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all checks (compile + test + lint + style)
npm test

# Type-check only (no emit)
npm run ci:compile

# Run tests (no coverage)
npm run ci:test

# Run a single test file
NODE_OPTIONS="--disable-warning ExperimentalWarning --experimental-vm-modules" npx jest src/athena/athena.spec.ts

# Lint
npm run ci:lint         # check
npm run lint:fix        # auto-fix

# Prettier
npm run ci:style        # check
npm run prettier:fix    # auto-fix

# Compile PEG grammars (src/peggy/*.peggy → src/peggy/*-peggy.ts)
npm run peggy

# Build distributable (dist-mjs + dist-types)
npm run prepublishOnly
```

## Architecture

This is an ESLint flat-config plugin (`@checkdigit/eslint-plugin`) that exports two named configs: `all` and `recommended`.

### Rule structure

Each rule lives in two files at `src/`:

- `<rule-name>.ts` — rule implementation; exports the rule as default and a `ruleId` string constant
- `<rule-name>.spec.ts` — Jest tests using `RuleTester` (via `src/tester.test.ts` for JS or `src/ts-tester.test.ts` for typed rules)

`src/index.ts` is the plugin entry point: it imports every rule, builds the `rules` record, then assembles `all` and `recommended` config arrays.

### Athena rule (`src/athena/`)

The `athena` rule is the most complex rule. It validates SQL strings (template literals and string literals starting with `SELECT` or `WITH`) against OpenAPI schemas at lint time.

Data flow:

1. **SQL parsing**: raw SQL string → `src/peggy/athena-peggy.ts` (compiled from `src/peggy/athena.peggy` via `npm run peggy`) → AST
2. **API location**: table names in the SQL are treated as service names; `api-locator.ts` looks up `src/services/<camelCaseName>/*/swagger.schema.deref.json`
3. **API matching**: `api-matcher.ts` uses WHERE-clause conditions (`method =`, `split(url, '/')`, `cardinality(...)`) to narrow down matching API operations from the OpenAPI schema
4. **Column resolution**: `athena.ts` (`checkSelect`) resolves each selected column to a JSON Schema type, following property accessors (`json_extract_scalar`, JSON bracket notation), UNNEST, CTEs (WITH), and UNION (via `_next`)
5. **Schema extraction**: `src/openapi/generate-schema.ts` converts OpenAPI YAML (`swagger.yml`) to a flat `ApiSchemas` object (`swagger.schema.json`); the deref'd version (`swagger.schema.deref.json`) is what the rule reads at runtime

Each Athena "table" resolves to columns: `method`, `started`, `ended`, `url`, `requestbody`, `requestheaders`, `responsestatus`, `responsemessage`, `responsetype`, `responsebody`, `responseheaders`.

### OpenAPI utilities (`src/openapi/`)

- `generate-schema.ts` — reads `swagger.yml` for each endpoint listed in `package.json#service.api.endpoints`, produces a `swagger.schema.json` with typed request/response schemas
- `deref-schema.ts` — dereferences `$ref` pointers to produce `swagger.schema.deref.json`

### PEG grammar (`src/peggy/`)

`.peggy` files are PEG grammars compiled with `peggy --format es` to TypeScript. Run `npm run peggy` after editing any `.peggy` file. The generated `*-peggy.ts` files are committed.

### Testing helpers

- `src/tester.test.ts` — plain JS `RuleTester` (no type-checking)
- `src/ts-tester.test.ts` — TypeScript-aware `RuleTester` with `@typescript-eslint/parser` and project-based type info; required for rules that use the TypeScript type checker

### Build outputs

- `dist-mjs/` — ESM build (`.mjs` extension), consumed at runtime
- `dist-types/` — TypeScript declarations

Test and spec files are excluded from the published package.
