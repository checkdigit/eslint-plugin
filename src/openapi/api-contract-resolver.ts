// api/api-contract-resolver.ts

import { promises as fs } from 'node:fs';

export default async function resolveApiContract(serviceName: string, version: string): Promise<unknown> {
  const apiSchemaFileContents = await fs.readFile(`./src/api/swagger.schema.json`, 'utf-8');
  console.log(apiSchemaFileContents);

  return JSON.parse(apiSchemaFileContents);
}
