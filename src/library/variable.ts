// library/variable.ts

export function isValidPropertyName(name: unknown): boolean {
  return typeof name === 'string' && /^[a-zA-Z_$][a-zA-Z_$0-9]*$/u.test(name);
}
