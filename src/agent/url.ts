// agent/url.ts

export const PLAIN_URL_REGEXP = /^[`']\/\w+(?<serviceNamePart>-\w+)*\/v\d+\/(?<any>.|\r|\n)+[`']$/u;
export const TOKENIZED_URL_REGEXP = /^`\$\{(?<serviceNamePart>[A-Z]+_)*BASE_PATH\}\/(?<any>.|\r|\n)+`$/u;

export function replaceEndpointUrlPrefixWithBasePath(url: string) {
  // eslint-disable-next-line no-template-curly-in-string
  return url.replace(/^`\/\w+(?<parts>-\w+)*\/v\d+\//u, '`${BASE_PATH}/');
}

export function replaceEndpointUrlPrefixWithDomain(url: string) {
  return url.replace(
    /^(?<quotStart>[`'])\/(?<servicename>\w+(?<parts>-\w+)*)(?<path>\/v\d+\/(?<any>.|\r|\n)+(?<quotEnd>[`'])$)/u,
    '$1https://$2.checkdigit/$2$4',
  );
}

export function addBasePathUrlDomain(url: string) {
  return url.replace(
    /^(?<quotStart>[`'])\/(?<servicename>\w+(?<parts>-\w+)*)(?<path>\/v\d+(?<quotEnd>[`'])$)/u,
    '$1https://$2.checkdigit/$2$4',
  );
}
