// is-aws-sdk-v3-used.ts

import { promises as fs } from 'node:fs';

export default async function isAwsSdkV3Used(): Promise<boolean> {
  const isService = process.env['SERVICE_NAME'] !== undefined;
  if (!isService) {
    return false;
  }

  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8')) as {
    dependencies?: Record<string, string>;
    service?: {
      awsSdkV2?: boolean;
    };
  };
  const dependencies = packageJson.dependencies ?? {};

  const hasAwsSdkV3Dependency = Object.keys(dependencies).some((dependency) => dependency.startsWith('@aws-sdk/'));
  const isAwsSdkV2Used =
    Object.keys(dependencies).some((dependency) => dependency === '@checkdigit/aws') ||
    packageJson.service?.awsSdkV2 === true;

  return !isAwsSdkV2Used && hasAwsSdkV3Dependency;
}
