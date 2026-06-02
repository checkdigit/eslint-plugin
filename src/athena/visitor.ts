// athena/visitor.ts

import debug from 'debug';

const log = debug('athena:visitor');

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
  With,
} from './types';

// UNNEST is not in types.ts (the grammar produces it but the TS types don't model it).
export interface UnnestFrom {
  type: 'unnest';
  expr: ColumnRefItem;
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

export function isUnnestFrom(node: unknown): node is UnnestFrom {
  return typeof node === 'object' && node !== null && (node as { type?: unknown }).type === 'unnest';
}

export function isDual(node: unknown): node is Dual {
  return typeof node === 'object' && node !== null && (node as { type?: unknown }).type === 'dual';
}

export function isTableExpr(node: unknown): node is TableExpr {
  if (typeof node !== 'object' || node === null) {
    return false;
  }
  const expr = (node as { expr?: unknown }).expr;
  return typeof expr === 'object' && expr !== null && 'ast' in expr;
}

export function isJoin(node: unknown): node is Join {
  return (
    !isUnnestFrom(node) &&
    !isDual(node) &&
    !isTableExpr(node) &&
    typeof node === 'object' &&
    node !== null &&
    'join' in node
  );
}

export function isBaseFrom(node: unknown): node is BaseFrom {
  return (
    !isUnnestFrom(node) &&
    !isDual(node) &&
    !isTableExpr(node) &&
    !isJoin(node) &&
    typeof node === 'object' &&
    node !== null &&
    'table' in node
  );
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
  visitor.visitBaseFrom?.(node);
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
    let fromItems: From[];
    if (Array.isArray(sel.from)) {
      fromItems = sel.from;
    } else if (sel.from !== null) {
      fromItems = [sel.from];
    } else {
      fromItems = [];
    }
    for (const fromItem of fromItems) {
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

/** Return the path string from the first json_extract_scalar / json_extract call found. */
export function extractJsonExtractPath(expr: unknown): string | undefined {
  let path: string | undefined;
  walkExpr(expr, {
    visitFunction(node) {
      if (path !== undefined) {
        return;
      }
      const fnName = node.name.name[0]?.value;
      if (fnName === 'json_extract_scalar' || fnName === 'json_extract') {
        const pathArg = node.args?.value[1];
        if (pathArg !== undefined) {
          const val = (pathArg as unknown as { value?: unknown }).value;
          if (typeof val === 'string') {
            path = val;
          }
        }
        log('extractJsonExtractPath, function:', fnName, path);
      }
    },
  });
  return path;
}

export interface JsonExtractCall {
  ref: ColumnRefItem;
  path: string;
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
      calls.push({ ref, path });
    },
  });
  return calls;
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
