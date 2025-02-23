// openapi/deref-schema.ts

import { promises as fs } from 'node:fs';

import refParser from '@apidevtools/json-schema-ref-parser';

export async function derefSchema(schemaFileName: string): Promise<void> {
  const schemaFile = await fs.readFile(`${schemaFileName}.json`, 'utf-8');
  const adjustedSchemaFileForDeref = schemaFile.replace(/"\$ref": ".*\/definitions\//gu, '"$ref": "#/definitions/');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const json = JSON.parse(adjustedSchemaFileForDeref);
  const deref = await refParser.dereference(json);
  await fs.writeFile(`${schemaFileName}.deref.json`, JSON.stringify(deref, null, 2));
}
