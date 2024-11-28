// agent/url.ts

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const PLAIN_URL_REGEXP: RegExp = /^[`']\/\w+(?<serviceNamePart>-\w+)*\/v\d+\/(?<any>.|\r|\n)+[`']$/u;
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const TOKENIZED_URL_REGEXP: RegExp = /^`\$\{(?<serviceNamePart>[A-Z]+_)*BASE_PATH\}\/(?<any>.|\r|\n)+`$/u;

export function isServiceApiCallUrl(url: string): boolean {
  return PLAIN_URL_REGEXP.test(url) || TOKENIZED_URL_REGEXP.test(url);
}

export function replaceEndpointUrlPrefixWithBasePath(url: string): string {
  return url.replace(
    /^(?<quotStart>[`'])\/(?<servicename>\w+(?<parts>-\w+)*)(?<path>\/v\d+\/)(?<endpoint>(?<any>.|\r|\n)+)(?<quotEnd>[`'])$/u,
    // eslint-disable-next-line no-template-curly-in-string
    '`${BASE_PATH}/$5`',
  );
}

export function replaceEndpointUrlPrefixWithDomain(url: string): string {
  return url.replace(
    /^(?<quotStart>[`'])\/(?<servicename>\w+(?<parts>-\w+)*)(?<path>\/v\d+\/(?<any>.|\r|\n)+(?<quotEnd>[`'])$)/u,
    '$1https://$2.checkdigit/$2$4',
  );
}

export function addBasePathUrlDomain(url: string): string {
  return url.replace(
    /^(?<quotStart>[`'])\/(?<servicename>\w+(?<parts>-\w+)*)(?<path>\/v\d+(?<quotEnd>[`'])$)/u,
    '$1https://$2.checkdigit/$2$4',
  );
}
