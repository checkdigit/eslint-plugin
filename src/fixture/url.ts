// fixture/url.ts

export function replaceEndpointUrlPrefixWithBasePath(url: string) {
  // eslint-disable-next-line no-template-curly-in-string
  return url.replace(/`\/\w+(?<parts>-\w+)*\/v\d+\//u, '`${BASE_PATH}/');
}
