// fixture/url.ts

export const PLAIN_URL_REGEXP = /^[`']\/\w+(?<serviceNamePart>-\w+)*\/v\d+\/(?<any>.|\r|\n)+[`']$/u;
export const TOKENIZED_URL_REGEXP = /^`\$\{(?<serviceNamePart>[A-Z]+_)*BASE_PATH\}\/(?<any>.|\r|\n)+`$/u;

export function replaceEndpointUrlPrefixWithBasePath(url: string) {
  // eslint-disable-next-line no-template-curly-in-string
  return url.replace(/^`\/\w+(?<parts>-\w+)*\/v\d+\//u, '`${BASE_PATH}/');
}

export function replaceEndpointUrlPrefixWithDomain(url: string) {
  // eslint-disable-next-line no-template-curly-in-string
  return url.replace(/\/(?<servicename>\w+(?<parts>-\w+)*)(?<path>\/v\d+\/.*$)/u, 'https://$1.checkdigit/$1$3');
}
