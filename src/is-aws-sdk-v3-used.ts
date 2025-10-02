// is-aws-sdk-v3-used.ts

import { promises as fs } from 'node:fs';

interface PackageJson {
  dependencies?: Record<string, string>;
  service?: {
    awsSdkV2?: boolean;
  };
}

let cachedIsAwsSdkV3Used: boolean | undefined;

export default async function isAwsSdkV3Used(): Promise<boolean> {
  if (cachedIsAwsSdkV3Used !== undefined) {
    return cachedIsAwsSdkV3Used;
  }

  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as PackageJson;
  const dependencies = packageJson.dependencies ?? {};
  // eslint-disable-next-line require-atomic-updates
  cachedIsAwsSdkV3Used = Object.keys(dependencies).some((dependency) => dependency.startsWith('@aws-sdk/'));
  return cachedIsAwsSdkV3Used;
}
