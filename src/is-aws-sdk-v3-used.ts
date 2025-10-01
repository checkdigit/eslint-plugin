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

  process.loadEnvFile();
  const isService = process.env['SERVICE_NAME'] !== undefined;
  if (!isService) {
    return false;
  }

  let packageJson;
  try {
    packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8')) as PackageJson;
  } catch {
    return false;
  }
  const dependencies = packageJson.dependencies ?? {};

  const hasAwsSdkV3Dependency = Object.keys(dependencies).some((dependency) => dependency.startsWith('@aws-sdk/'));
  const isAwsSdkV2Used =
    Object.keys(dependencies).some((dependency) => dependency === '@checkdigit/aws') ||
    packageJson.service?.awsSdkV2 === true;

  // eslint-disable-next-line require-atomic-updates
  cachedIsAwsSdkV3Used = !isAwsSdkV2Used && hasAwsSdkV3Dependency;
  return cachedIsAwsSdkV3Used;
}
