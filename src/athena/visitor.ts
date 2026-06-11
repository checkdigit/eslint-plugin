// athena/visitor.ts

import type {
  AggrFunc,
  BaseFrom,
  Binary,
  Case,
  Cast,
  Column,
  ColumnRefItem,
  Dual,
  ExpressionValue,
  ExprList,
  From,
  Function,
  Join,
  Select,
  TableExpr,
  ValuesFrom,
  With,
} from './types';

// UNNEST is not in types.ts (the grammar produces it but the TS types don't model it).
export interface UnnestFrom {
  type: 'unnest';
  // expr is a column_ref when used with CROSS JOIN; for standalone UNNEST (e.g.
  // UNNEST(SEQUENCE(...))) it is a function call with no `column` property.
  expr: ColumnRefItem | { type: string };
  parentheses: boolean;
  as: {
    type: 'function';
    name: { name: { type: string; value: string }[] };
    args: ExprList;
  } | null;
}

// ColumnRefItem is extended by the parser with array_index for bracket access (e.g. col['key']).
export interface ColumnRefWithIndex extends ColumnRefItem {
  array_index: { brackets: true; index: { type: string; value: unknown } }[];
}

// -------------------------------------------------------------------
// Visitor map — all hooks are optional; implement only what you need.
// -------------------------------------------------------------------

export interface VisitorMap {
  visitSelect?(node: Select): void;
  visitWith?(node: With): void;
  visitBaseFrom?(node: BaseFrom): void;
  visitJoin?(node: Join): void;
  visitTableExpr?(node: TableExpr): void;
  visitUnnest?(node: UnnestFrom): void;
  visitColumn?(node: Column): void;
  visitColumnRef?(node: ColumnRefItem): void;
  visitFunction?(node: Function): void;
  visitBinary?(node: Binary): void;
  visitAggrFunc?(node: AggrFunc): void;
  visitCast?(node: Cast): void;
  visitCase?(node: Case): void;
  visitExprList?(node: ExprList): void;
  visitValue?(node: ExpressionValue): void;
}

// -------------------------------------------------------------------
// Type guards — all accept `unknown` so callers can pass untyped AST
// nodes without an intermediate cast.
// -------------------------------------------------------------------

function hasNodeType(node: unknown, type: string): boolean {
  return typeof node === 'object' && node !== null && (node as { type?: unknown }).type === type;
}

export function isUnnestFrom(node: unknown): node is UnnestFrom {
  return hasNodeType(node, 'unnest');
}

export function isDual(node: unknown): node is Dual {
  return hasNodeType(node, 'dual');
}

export function isValuesFrom(node: unknown): node is ValuesFrom {
  if (typeof node !== 'object' || node === null) {
    return false;
  }
  return hasNodeType((node as { expr?: unknown }).expr, 'values');
}

export function isTableExpr(node: unknown): node is TableExpr {
  if (typeof node !== 'object' || node === null) {
    return false;
  }
  const expr = (node as { expr?: unknown }).expr;
  return typeof expr === 'object' && expr !== null && 'ast' in expr;
}

function isRegularFromItem(node: unknown): boolean {
  return typeof node === 'object' && node !== null && !isUnnestFrom(node) && !isDual(node) && !isTableExpr(node);
}

export function isJoin(node: unknown): node is Join {
  return isRegularFromItem(node) && 'join' in (node as object);
}

export function isBaseFrom(node: unknown): node is BaseFrom {
  return isRegularFromItem(node) && !isJoin(node) && 'table' in (node as object);
}

export function hasArrayIndex(node: ColumnRefItem): node is ColumnRefWithIndex {
  const typed = node as unknown as { array_index?: unknown };
  return Array.isArray(typed.array_index) && typed.array_index.length > 0;
}

// -------------------------------------------------------------------
// Core walk helpers — defined before walk() to satisfy no-use-before-define.
// walkExpr has a single forward reference to walk() for nested selects.
// -------------------------------------------------------------------

function walkExpr(node: unknown, visitor: VisitorMap): void {
  if (typeof node !== 'object' || node === null) {
    return;
  }
  const typed = node as Record<string, unknown>;

  switch (typed['type']) {
    case 'select': {
      // eslint-disable-next-line no-use-before-define
      walk(node, visitor);
      break;
    }
    case 'expr': {
      walkExpr((node as Column).expr, visitor);
      break;
    }
    case 'binary_expr': {
      const bin = node as Binary;
      visitor.visitBinary?.(bin);
      walkExpr(bin.left, visitor);
      walkExpr(bin.right, visitor);
      break;
    }
    case 'column_ref': {
      visitor.visitColumnRef?.(node as ColumnRefItem);
      break;
    }
    case 'function': {
      const fn = node as Function;
      visitor.visitFunction?.(fn);
      if (fn.args !== undefined) {
        walkExpr(fn.args, visitor);
      }
      break;
    }
    case 'aggr_func': {
      const agg = node as AggrFunc;
      visitor.visitAggrFunc?.(agg);
      walkExpr(agg.args.expr, visitor);
      break;
    }
    case 'cast': {
      const cast = node as Cast;
      visitor.visitCast?.(cast);
      walkExpr(cast.expr, visitor);
      break;
    }
    case 'case': {
      const caseNode = node as Case;
      visitor.visitCase?.(caseNode);
      for (const arm of caseNode.args) {
        if ('cond' in arm) {
          walkExpr(arm.cond, visitor);
        }
        walkExpr(arm.result, visitor);
      }
      break;
    }
    case 'expr_list': {
      const list = node as ExprList;
      visitor.visitExprList?.(list);
      for (const item of list.value) {
        walkExpr(item, visitor);
      }
      break;
    }
    case 'array': {
      // ARRAY [...] nodes nest their items inside an expr_list property, not args/value.
      walkExpr((node as { expr_list?: unknown }).expr_list, visitor);
      break;
    }
    default: {
      // Column wrapper nodes (e.g. bare `SELECT *`) may lack a 'type' field but carry an 'expr'.
      if (typed['type'] === undefined && 'expr' in typed) {
        walkExpr(typed['expr'], visitor);
      } else {
        visitor.visitValue?.(node as ExpressionValue);
      }
      break;
    }
  }
}

function walkFrom(node: From, visitor: VisitorMap): void {
  if (isDual(node)) {
    return;
  }
  if (isUnnestFrom(node)) {
    visitor.visitUnnest?.(node);
    return;
  }
  if (isTableExpr(node)) {
    visitor.visitTableExpr?.(node);
    // eslint-disable-next-line no-use-before-define
    walk(node.expr.ast, visitor);
    return;
  }
  if (isJoin(node)) {
    visitor.visitJoin?.(node);
    if (node.on !== undefined) {
      walkExpr(node.on, visitor);
    }
    return;
  }
  if (isValuesFrom(node)) {
    return;
  }
  visitor.visitBaseFrom?.(node);
}

/** Normalise select.from (null / single item / array) to a From[]. */
export function fromClauseItems(select: Select): From[] {
  if (Array.isArray(select.from)) {
    return select.from;
  }
  if (select.from !== null) {
    return [select.from];
  }
  return [];
}

// -------------------------------------------------------------------
// Core walk — dispatches per node type and recurses into children.
// -------------------------------------------------------------------

export function walk(node: unknown, visitor: VisitorMap): void {
  if (typeof node !== 'object' || node === null) {
    return;
  }
  const typed = node as Record<string, unknown>;

  if (typed['type'] === 'select') {
    const sel = node as Select;
    visitor.visitSelect?.(sel);
    for (const withItem of sel.with ?? []) {
      visitor.visitWith?.(withItem);
      walk(withItem.stmt.ast, visitor);
    }
    for (const fromItem of fromClauseItems(sel)) {
      walkFrom(fromItem, visitor);
    }
    for (const col of sel.columns) {
      walkExpr(col, visitor);
    }
    if (sel.where !== null) {
      walkExpr(sel.where, visitor);
    }
    if (sel._next !== undefined) {
      walk(sel._next, visitor);
    }
  } else {
    walkExpr(node, visitor);
  }
}

// -------------------------------------------------------------------
// Convenience extractors — replace ad-hoc JSONPath queries.
// -------------------------------------------------------------------

/** Return true if the expression contains a lambda (`->`) subexpression. */
export function containsLambda(expr: unknown): boolean {
  let found = false;
  walkExpr(expr, {
    visitBinary(node) {
      if (node.operator === '->') {
        found = true;
      }
    },
  });
  return found;
}

/** Collect all column_ref nodes within an expression subtree. */
export function extractColumnRefs(expr: unknown): ColumnRefItem[] {
  const refs: ColumnRefItem[] = [];
  walkExpr(expr, {
    visitColumnRef(node) {
      refs.push(node);
    },
  });
  return refs;
}

export interface JsonExtractCall {
  ref: ColumnRefItem;
  path: string;
  fnNode: Function;
}

/** Collect ALL json_extract / json_extract_scalar calls as (source column_ref, path) pairs. */
export function extractJsonExtractCalls(expr: unknown): JsonExtractCall[] {
  const calls: JsonExtractCall[] = [];
  walkExpr(expr, {
    visitFunction(node) {
      const fnName = node.name.name[0]?.value;
      if (fnName !== 'json_extract_scalar' && fnName !== 'json_extract') {
        return;
      }
      const sourceArg = node.args?.value[0];
      const pathArg = node.args?.value[1];
      if (sourceArg === undefined || pathArg === undefined) {
        return;
      }
      const sourceRefs = extractColumnRefs(sourceArg);
      if (sourceRefs.length !== 1) {
        return;
      }
      const [ref] = sourceRefs;
      const path = (pathArg as unknown as { value?: unknown }).value;
      if (ref === undefined || typeof path !== 'string') {
        return;
      }
      calls.push({ ref, path, fnNode: node });
    },
  });
  return calls;
}

/** Return the path string from the first json_extract_scalar / json_extract call found. */
export function extractJsonExtractPath(expr: unknown): string | undefined {
  return extractJsonExtractCalls(expr)[0]?.path;
}

/** Return the JSONPath-style string from a bracket accessor (col['key']), or undefined. */
export function extractBracketAccessorPath(expr: unknown): string | undefined {
  let path: string | undefined;
  walkExpr(expr, {
    visitColumnRef(node) {
      if (path !== undefined || !hasArrayIndex(node)) {
        return;
      }
      const indexValue = node.array_index[0]?.index.value;
      if (typeof indexValue === 'string') {
        path = `$["${indexValue}"]`;
      }
    },
  });
  return path;
}

/** Return true if the expression tree contains any function or aggregate call. */
export function hasFunctionCalls(expr: unknown): boolean {
  let found = false;
  walkExpr(expr, {
    visitFunction() {
      found = true;
    },
    visitAggrFunc() {
      found = true;
    },
  });
  return found;
}

function containsCastToType(expr: unknown, dataType: 'ARRAY' | 'MAP'): boolean {
  let found = false;
  walkExpr(expr, {
    visitCast(node) {
      const target = (node as unknown as { target?: { dataType?: string }[] }).target?.[0];
      if (target?.dataType === dataType) {
        found = true;
      }
    },
  });
  return found;
}

/** Return true when the expression tree contains any CAST / TRY_CAST to ARRAY<…>. */
export function containsCastToArray(expr: unknown): boolean {
  return containsCastToType(expr, 'ARRAY');
}

/** Return true when the expression tree contains any CAST / TRY_CAST to MAP<…>. */
export function containsCastToMap(expr: unknown): boolean {
  return containsCastToType(expr, 'MAP');
}
