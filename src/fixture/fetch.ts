// fixture/fetch.ts

export function getResponseBodyRetrievalText(responseVariableName: string) {
  return `await ${responseVariableName}.json()`;
}
