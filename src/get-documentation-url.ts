// get-documentation-url.ts

import packageJson from '../package.json';
import path from 'node:path';

const repoUrl = 'https://github.com/checkdigit/eslint-plugin';

export default function getDocumentationUrl(filename: string): string {
  const ruleName = path.basename(filename, '.ts');
  return `${repoUrl}/blob/v${packageJson.version}/docs/rules/${ruleName}.md`;
}
