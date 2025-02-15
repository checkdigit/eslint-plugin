// Type definitions for node-sql-parser 1.0
// Project: https://github.com/taozhi8833998/node-sql-parser#readme
// Definitions by: taozhi8833998 <https://github.com/taozhi8833998>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.4

/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

export interface With {
  name: { value: string };
  stmt: {
    _parentheses?: boolean;
    tableList: string[];
    columnList: string[];
    ast: Select;
  };
  columns?: any[];
}
interface Location {
  line: number;
  column: number;
  offset: number;
}

interface LocationRange {
  start: Location;
  end: Location;
}

export type WhilteListCheckMode = 'table' | 'column';
export interface ParseOptions {
  includeLocations?: boolean;
}
export interface Option {
  database?: string;
  type?: string;
  trimQuery?: boolean;
  parseOptions?: ParseOptions;
}
export interface TableColumnAst {
  tableList: string[];
  columnList: string[];
  ast: AST[] | AST;
  loc?: LocationRange;
}
export interface BaseFrom {
  db: string | null;
  table: string;
  as: string | null;
  schema?: string;
  loc?: LocationRange;
}
export interface Join extends BaseFrom {
  join: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN';
  using?: string[];
  on?: Binary;
}
export interface TableExpr {
  expr: {
    ast: Select;
  };
  as?: string | null;
  parentheses: boolean | { length: number };
}
export interface Dual {
  type: 'dual';
  loc?: LocationRange;
}
export type From = BaseFrom | Join | TableExpr | Dual;
export interface LimitValue {
  type: string;
  value: number;
  loc?: LocationRange;
}
export interface Limit {
  seperator: string;
  value: LimitValue[];
  loc?: LocationRange;
}
export interface OrderBy {
  type: 'ASC' | 'DESC';
  expr: any;
  loc?: LocationRange;
}

export interface ValueExpr<T = string | number | boolean> {
  type:
    | 'backticks_quote_string'
    | 'string'
    | 'regex_string'
    | 'hex_string'
    | 'full_hex_string'
    | 'natural_string'
    | 'bit_string'
    | 'double_quote_string'
    | 'single_quote_string'
    | 'boolean'
    | 'bool'
    | 'null'
    | 'star'
    | 'param'
    | 'origin'
    | 'date'
    | 'datetime'
    | 'default'
    | 'time'
    | 'timestamp'
    | 'var_string';
  value: T;
}

export interface ColumnRefItem {
  type: 'column_ref';
  table: string | null;
  column: string | { expr: ValueExpr };
  options?: ExprList;
  loc?: LocationRange;
}
export interface ColumnRefExpr {
  type: 'expr';
  expr: ColumnRefItem;
  as: string | null;
}

export type ColumnRef = ColumnRefItem | ColumnRefExpr;
export interface SetList {
  column: string;
  value: any;
  table: string | null;
  loc?: LocationRange;
}
export interface InsertReplaceValue {
  type: 'expr_list';
  value: any[];
  loc?: LocationRange;
}

export interface Star {
  type: 'star';
  value: '*' | '';
  loc?: LocationRange;
}
export interface Case {
  type: 'case';
  expr: null;
  args: (
    | {
        cond: Binary;
        result: ExpressionValue;
        type: 'when';
      }
    | {
        result: ExpressionValue;
        type: 'else';
      }
  )[];
}
export interface Cast {
  type: 'cast';
  keyword: 'cast';
  expr: ExpressionValue;
  symbol: 'as';
  target: {
    dataType: string;
    suffix: unknown[];
  };
}
export interface AggrFunc {
  type: 'aggr_func';
  name: string;
  args: {
    expr: ExpressionValue;
    distinct: 'DISTINCT' | null;
    orderby: OrderBy[] | null;
    parentheses?: boolean;
  };
  loc?: LocationRange;
}

export interface FunctionName {
  schema?: { value: string; type: string };
  name: ValueExpr<string>[];
}
export interface Function {
  type: 'function';
  name: FunctionName;
  args?: ExprList;
  suffix?: any;
  loc?: LocationRange;
}
export interface Column {
  expr: ExpressionValue;
  as: ValueExpr<string> | string | null;
  type?: string;
  loc?: LocationRange;
}

export interface Interval {
  type: 'interval';
  unit: string;
  expr: ValueExpr & { loc?: LocationRange };
}

export interface Param {
  type: 'param';
  value: string;
  loc?: LocationRange;
}

export interface Value {
  type: string;
  value: any;
  loc?: LocationRange;
}

export interface Binary {
  type: 'binary_expr';
  operator: string;
  left: ExpressionValue | ExprList;
  right: ExpressionValue | ExprList;
  loc?: LocationRange;
  parentheses?: boolean;
}

export type Expr = Binary;

export type ExpressionValue = ColumnRef | Param | Function | Case | AggrFunc | Value | Binary | Cast | Interval;

export interface ExprList {
  type: 'expr_list';
  value: ExpressionValue[];
  loc?: LocationRange;
  parentheses?: boolean;
  separator?: string;
}

export type PartitionBy = {
  type: 'expr';
  expr: ColumnRef[];
}[];

export interface WindowSpec {
  name: null;
  partitionby: PartitionBy;
  orderby: OrderBy[] | null;
  window_frame_clause: string | null;
}

export type AsWindowSpec = string | { window_specification: WindowSpec; parentheses: boolean };

export interface NamedWindowExpr {
  name: string;
  as_window_specification: AsWindowSpec;
}

export interface WindowExpr {
  keyword: 'window';
  type: 'window';
  expr: NamedWindowExpr[];
}

export interface Select {
  with: With[] | null;
  type: 'select';
  options: any[] | null;
  distinct: 'DISTINCT' | null;
  columns: any[] | Column[];
  from: From[] | TableExpr | null;
  where: Binary | Function | null;
  groupby: { columns: ColumnRef[] | null; modifiers: ValueExpr<string>[] };
  having: any[] | null;
  orderby: OrderBy[] | null;
  limit: Limit | null;
  window?: WindowExpr;
  qualify?: any[] | null;
  _orderby?: OrderBy[] | null;
  _limit?: Limit | null;
  parentheses_symbol?: boolean;
  _parentheses?: boolean;
  loc?: LocationRange;
  _next?: Select;
  set_op?: string;
}
export interface Insert_Replace {
  type: 'replace' | 'insert';
  table: any;
  columns: string[] | null;
  values: InsertReplaceValue[] | Select;
  partition: any[];
  prefix: string;
  on_duplicate_update: {
    keyword: 'on duplicate key update';
    set: SetList[];
  };
  loc?: LocationRange;
}
export interface Update {
  type: 'update';
  db: string | null;
  table: (From | Dual)[] | null;
  set: SetList[];
  where: Binary | Function | null;
  loc?: LocationRange;
}
export interface Delete {
  type: 'delete';
  table: any;
  from: (From | Dual)[];
  where: Binary | Function | null;
  loc?: LocationRange;
}

export interface Alter {
  type: 'alter';
  table: From[];
  expr: any;
  loc?: LocationRange;
}

export interface Use {
  type: 'use';
  db: string;
  loc?: LocationRange;
}

type KW_UNSIGNED = 'UNSIGNED';
type KW_ZEROFILL = 'ZEROFILL';

type Timezone = ['WITHOUT' | 'WITH', 'TIME', 'ZONE'];

interface KeywordComment {
  type: 'comment';
  keyword: 'comment';
  symbol?: '=';
  value: string;
}

interface CollateExpr {
  type: 'collate';
  symbol?: '=';
  value: string;
}

interface DataType {
  dataType: string;
  length?: number;
  parentheses?: true;
  suffix?: Timezone | (KW_UNSIGNED | KW_ZEROFILL)[];
  array?: 'one' | 'two';
}

interface LiteralNotNull {
  type: 'not null';
  value: 'not null';
}

interface LiteralNull {
  type: 'null';
  value: null;
}

type LiteralNumeric = number | { type: 'bigint'; value: string };

interface ColumnConstraint {
  default_val: {
    type: 'default';
    value: any;
  };
  nullable: LiteralNotNull | LiteralNull;
}

interface ColumnDefinitionOptList {
  nullable?: ColumnConstraint['nullable'];
  default_val?: ColumnConstraint['default_val'];
  auto_increment?: 'auto_increment';
  unique?: 'unique' | 'unique key';
  primary?: 'key' | 'primary key';
  comment?: KeywordComment;
  collate?: { collate: CollateExpr };
  column_format?: { column_format: any };
  storage?: { storage: any };
  reference_definition?: { reference_definition: any };
  character_set?: { type: 'CHARACTER SET'; value: string; symbol?: '=' };
}

type CreateColumnDefinition = {
  column: ColumnRef;
  definition: DataType;
  resource: 'column';
} & ColumnDefinitionOptList;

interface IndexType {
  keyword: 'using';
  type: 'btree' | 'hash' | 'gist' | 'gin';
}

interface IndexOption {
  type: 'key_block_size';
  symbol?: '=';
  expr: LiteralNumeric;
}

interface CreateIndexDefinition {
  index?: string;
  definition: ColumnRef[];
  keyword: 'index' | 'key';
  index_type?: IndexType;
  resource: 'index';
  index_options?: IndexOption[];
}

interface CreateFulltextSpatialIndexDefinition {
  index?: string;
  definition: ColumnRef[];
  keyword?: 'fulltext' | 'spatial' | 'fulltext key' | 'spatial key' | 'fulltext index' | 'spatial index';
  index_options?: IndexOption[];
  resource: 'index';
}

interface ConstraintName {
  keyword: 'constraint';
  constraint: string;
}

interface CreateConstraintPrimary {
  constraint?: ConstraintName['constraint'];
  definition: ColumnRef[];
  constraint_type: 'primary key';
  keyword?: ConstraintName['keyword'];
  index_type?: IndexType;
  resource: 'constraint';
  index_options?: IndexOption[];
}

interface CreateConstraintUnique {
  constraint?: ConstraintName['constraint'];
  definition: ColumnRef[];
  constraint_type: 'unique key' | 'unique' | 'unique index';
  keyword?: ConstraintName['keyword'];
  index_type?: IndexType;
  index?: string;
  resource: 'constraint';
  index_options?: IndexOption[];
}

interface CreateConstraintForeign {
  constraint?: ConstraintName['constraint'];
  definition: ColumnRef[];
  constraint_type: 'FOREIGN KEY';
  keyword?: ConstraintName['keyword'];
  index?: string;
  resource: 'constraint';
  reference_definition?: any;
}

interface CreateConstraintCheck {
  constraint?: ConstraintName['constraint'];
  definition: any[];
  constraint_type: 'check';
  keyword?: ConstraintName['keyword'];
  resource: 'constraint';
}

type CreateConstraintDefinition =
  | CreateConstraintPrimary
  | CreateConstraintUnique
  | CreateConstraintForeign
  | CreateConstraintCheck;

type CreateDefinition =
  | CreateColumnDefinition
  | CreateIndexDefinition
  | CreateFulltextSpatialIndexDefinition
  | CreateConstraintDefinition;

export interface Create {
  type: 'create';
  keyword: 'table' | 'index' | 'database';
  temporary?: 'temporary' | null;
  table?: { db: string; table: string }[];
  if_not_exists?: 'if not exists' | null;
  like?: {
    type: 'like';
    table: string;
    parentheses?: boolean;
  } | null;
  ignore_replace?: 'ignore' | 'replace' | null;
  as?: string | null;
  query_expr?: any | null;
  create_definitions?: CreateDefinition[] | null;
  table_options?: any[] | null;
  index_using?: {
    keyword: 'using';
    type: 'btree' | 'hash';
  } | null;
  index?: string | null;
  on_kw?: 'on' | null;
  index_columns?: any[] | null;
  index_type?: 'unique' | 'fulltext' | 'spatial' | null;
  index_options?: any[] | null;
  algorithm_option?: {
    type: 'alter';
    keyword: 'algorithm';
    resource: 'algorithm';
    symbol: '=' | null;
    algorithm: 'default' | 'instant' | 'inplace' | 'copy';
  } | null;
  lock_option?: {
    type: 'alter';
    keyword: 'lock';
    resource: 'lock';
    symbol: '=' | null;
    lock: 'default' | 'none' | 'shared' | 'exclusive';
  } | null;
  database?: string;
  loc?: LocationRange;
}

export interface Drop {
  type: 'drop';
  keyword: string;
  name: any[];
}

export type AST = Use | Select | Insert_Replace | Update | Delete | Alter | Create | Drop;
