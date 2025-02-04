// service.ts

import ts from 'typescript';

export function isServiceResponse(type: ts.Type): boolean {
  return (
    type.getProperties().some((symbol) => symbol.name === 'status') &&
    type.getProperties().some((symbol) => symbol.name === 'headers') &&
    type.getProperties().some((symbol) => symbol.name === 'body')
  );
}
