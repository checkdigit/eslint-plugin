// get-documentation-url.ts

import packageJson from '../package.json';

export default function getDocumentationUrl(ruleId: string): string {
  return `${packageJson.repository.url}/blob/v${packageJson.version}/docs/rules/${ruleId}.md`;
}
