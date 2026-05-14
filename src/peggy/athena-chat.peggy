{
  // ===== Helpers =====
  function node(type, props) { return Object.assign({ type }, props); }
  function list(first, rest) { return [first, ...rest.map(r => r[3])]; }
  function qname(first, rest) { return [first, ...rest.map(r => r[3])].join('.'); }
}

Start
  = _ stmts:StatementList _ EOF { return stmts; }

EOF
  = !.

StatementList
  = head:Statement tail:(_ ";" _ Statement)* _ ";"? {
      return [head, ...tail.map(t => t[3])];
    }

Statement
  = Query
  / DDL
  / ShowStmt
  / DescribeStmt
  / MsckRepair
  / UseStmt

// ======================
// DML (Trino-style)
// ======================

Query
  = WithQuery / QueryTerm

WithQuery
  = "WITH"i __ ctes:CTEList __ body:QueryTerm {
      return node("WithQuery", { ctes, body });
    }

CTEList
  = first:CTE rest:(_ "," _ CTE)* { return list(first, rest); }

CTE
  = name:Ident _ "AS"i _ "(" _ q:Query _ ")" {
      return node("CTE", { name, query: q });
    }

QueryTerm
  = left:QueryPrimary rest:(_ SetOp _ QueryPrimary)+ {
      return rest.reduce((acc, r) => node("SetOp", { op: r[1], left: acc, right: r[3] }), left);
    }
  / QueryPrimary

SetOp
  = "UNION ALL"i { return "UNION ALL"; }
  / "UNION"i     { return "UNION"; }
  / "INTERSECT"i { return "INTERSECT"; }
  / "EXCEPT"i    { return "EXCEPT"; }

QueryPrimary
  = SelectStmt
  / "(" _ q:Query _ ")" { return q; }

SelectStmt
  = "SELECT"i _ "DISTINCT"i _ sel:SelectList from:FromClause? where:WhereClause?
      group:GroupByClause? having:HavingClause? window:WindowClause?
      order:OrderByClause? limit:LimitClause?
    {
      return node("Select", {
        distinct: true, select: sel,
        from, where, groupBy: group ?? null, having: having ?? null,
        window: window ?? null, orderBy: order ?? null, limit: limit ?? null
      });
    }
  / "SELECT"i _ sel:SelectList from:FromClause? where:WhereClause?
      group:GroupByClause? having:HavingClause? window:WindowClause?
      order:OrderByClause? limit:LimitClause?
    {
      return node("Select", {
        distinct: false, select: sel,
        from, where, groupBy: group ?? null, having: having ?? null,
        window: window ?? null, orderBy: order ?? null, limit: limit ?? null
      });
    }

SelectList
  = first:SelectItem rest:(_ "," _ SelectItem)* { return list(first, rest); }

SelectItem
  = e:Expression _ "AS"i __ a:Ident   { return node("SelectItem", { expr: e, alias: a }); }
  / e:Expression __ a:Ident           { return node("SelectItem", { expr: e, alias: a }); }
  / e:Expression                      { return node("SelectItem", { expr: e }); }
  / "*"                               { return node("Star", {}); }
  / q:QualifiedStar                   { return node("QualifiedStar", { prefix: q }); }

QualifiedStar
  = first:Ident rest:(_ "." _ Ident)+ _ "." _ "*" {
      return [first, ...rest.map(r => r[3])];
    }

FromClause
  = _ "FROM"i _ src:Relation { return src; }

Relation
  = JoinedRelation
  / TableOrSubquery

JoinedRelation
  = left:TableOrSubquery rest:(_ JoinSpec _ TableOrSubquery)+ {
      return rest.reduce((acc, r) => node("Join", {
        kind: r[1].kind, lateral: r[1].lateral, criteria: r[1].criteria ?? null,
        left: acc, right: r[3]
      }), left);
    }

JoinSpec
  = "JOIN"i _ on:JoinCriteria? { return { kind:"INNER", lateral:false, criteria:on ?? null }; }
  / "INNER JOIN"i _ on:JoinCriteria? { return { kind:"INNER", lateral:false, criteria:on ?? null }; }
  / "LEFT JOIN"i _ on:JoinCriteria?  { return { kind:"LEFT",  lateral:false, criteria:on ?? null }; }
  / "LEFT OUTER JOIN"i _ on:JoinCriteria? { return { kind:"LEFT", lateral:false, criteria:on ?? null }; }
  / "RIGHT JOIN"i _ on:JoinCriteria? { return { kind:"RIGHT", lateral:false, criteria:on ?? null }; }
  / "FULL JOIN"i _ on:JoinCriteria?  { return { kind:"FULL",  lateral:false, criteria:on ?? null }; }
  / "FULL OUTER JOIN"i _ on:JoinCriteria? { return { kind:"FULL", lateral:false, criteria:on ?? null }; }
  / "CROSS JOIN"i { return { kind:"CROSS", lateral:false, criteria:null }; }
  / "LATERAL VIEW JOIN"i _ on:JoinCriteria? { return { kind:"LATERAL VIEW", lateral:true, criteria:on ?? null }; }

JoinCriteria
  = "ON"i _ e:Expression { return { type:"ON", expr:e }; }
  / "USING"i _ "(" _ cols:IdentList _ ")" { return { type:"USING", columns: cols }; }

TableOrSubquery
  = "(" _ q:Query _ ")" __ a:Ident { return node("Subquery", { query:q, alias:a }); }
  / "(" _ q:Query _ ")"            { return node("Subquery", { query:q }); }
  / t:TableName __ a:Ident         { return node("Table", { name:t, alias:a }); }
  / t:TableName                    { return node("Table", { name:t }); }
  / "UNNEST"i _ "(" _ args:ExprList _ ")" __ a:Ident {
      return node("Unnest", { args, alias:a });
    }
  / "UNNEST"i _ "(" _ args:ExprList _ ")" {
      return node("Unnest", { args });
    }

TableName
  = first:Ident rest:(_ "." _ Ident)* { return qname(first, rest); }

WhereClause
  = _ "WHERE"i _ e:Expression { return e; }

GroupByClause
  = _ "GROUP BY"i __ items:GroupByItemList { return items; }

GroupByItemList
  = first:GroupByItem rest:(_ "," _ GroupByItem)* { return list(first, rest); }

GroupByItem
  = "ROLLUP"i _ "(" _ l:ExprList _ ")" { return node("Rollup", { items:l }); }
  / "CUBE"i _ "(" _ l:ExprList _ ")"   { return node("Cube", { items:l }); }
  / "GROUPING SETS"i _ "(" _ sets:GroupingSets _ ")" { return node("GroupingSets", { sets }); }
  / e:Expression { return e; }

GroupingSets
  = first:GroupingSet rest:(_ "," _ GroupingSet)* { return list(first, rest); }

GroupingSet
  = "(" _ ")"              { return []; }
  / "(" _ l:ExprList _ ")" { return l; }

HavingClause
  = _ "HAVING"i _ e:Expression { return e; }

WindowClause
  = _ "WINDOW"i _ defs:WindowDefList { return defs; }

WindowDefList
  = first:WindowDef rest:(_ "," _ WindowDef)* { return list(first, rest); }

WindowDef
  = name:Ident _ "AS"i _ spec:WindowSpec { return node("WindowDef", { name, spec }); }

WindowSpec
  = "(" _ p:PartitionBy? o:OrderByClause? f:FrameSpec? _ ")" {
      return node("WindowSpec", { partitionBy: p ?? [], orderBy: o ?? null, frame: f ?? null });
    }

PartitionBy
  = "PARTITION BY"i __ l:ExprList { return l; }

FrameSpec
  = "ROWS"i _ FrameExtent
  / "RANGE"i _ FrameExtent

FrameExtent
  = "BETWEEN"i __ a:FrameBound __ "AND"i __ b:FrameBound { return { between:true, start:a, end:b }; }
  / b:FrameBound { return { between:false, end:b }; }

FrameBound
  = "UNBOUNDED PRECEDING"i { return { type:"UNBOUNDED_PRECEDING" }; }
  / "UNBOUNDED FOLLOWING"i { return { type:"UNBOUNDED_FOLLOWING" }; }
  / n:Integer __ "PRECEDING"i { return { type:"PRECEDING", value:n }; }
  / n:Integer __ "FOLLOWING"i { return { type:"FOLLOWING", value:n }; }
  / "CURRENT ROW"i { return { type:"CURRENT_ROW" }; }

OrderByClause
  = _ "ORDER BY"i __ first:SortItem rest:(_ "," _ SortItem)* { return list(first, rest); }

SortItem
  = e:Expression _ dir:SortDir? _ nulls:NullsOrder? {
      return node("SortItem", { expr:e, direction: dir ?? "ASC", nulls: nulls ?? null });
    }

SortDir
  = "ASC"i { return "ASC"; } / "DESC"i { return "DESC"; }

NullsOrder
  = "NULLS FIRST"i { return "NULLS FIRST"; }
  / "NULLS LAST"i  { return "NULLS LAST"; }

LimitClause
  = _ "LIMIT"i __ n:Integer { return n; }

// ======================
// Expressions
// ======================

ExprList
  = first:Expression rest:(_ "," _ Expression)* { return list(first, rest); }

Expression
  = LogicalOr

LogicalOr
  = left:LogicalAnd rest:(_ "OR"i _ LogicalAnd)* {
      return rest.reduce((acc, r) => node("BinaryOp", { op:"OR", left:acc, right:r[3] }), left);
    }

LogicalAnd
  = left:NotExpr rest:(_ "AND"i _ NotExpr)* {
      return rest.reduce((acc, r) => node("BinaryOp", { op:"AND", left:acc, right:r[3] }), left);
    }

NotExpr
  = "NOT"i __ e:NotExpr { return node("UnaryOp", { op:"NOT", expr:e }); }
  / Predicate

Predicate
  = left:ValueExpr tail:PredicateTail? {
      if (!tail) return left;
      return node("Predicate", Object.assign({ left }, tail));
    }

PredicateTail
  = _ "IS NULL"i       { return { kind:"IS NULL" }; }
  / _ "IS NOT NULL"i   { return { kind:"IS NOT NULL" }; }
  / _ "IS TRUE"i       { return { kind:"IS TRUE" }; }
  / _ "IS FALSE"i      { return { kind:"IS FALSE" }; }
  / _ "IS NOT TRUE"i   { return { kind:"IS NOT TRUE" }; }
  / _ "IS NOT FALSE"i  { return { kind:"IS NOT FALSE" }; }
  / _ "IN"i _ "(" _ l:ExprList _ ")" { return { kind:"IN", list:l }; }
  / _ "NOT IN"i _ "(" _ l:ExprList _ ")" { return { kind:"NOT IN", list:l }; }
  / _ "BETWEEN"i __ a:ValueExpr __ "AND"i __ b:ValueExpr { return { kind:"BETWEEN", lower:a, upper:b }; }
  / _ "LIKE"i __ p:ValueExpr ( __ "ESCAPE"i __ e:ValueExpr )? {
      return { kind:"LIKE", pattern:p, escape: e ?? null };
    }
  / _ "REGEXP_LIKE"i _ "(" _ v:Expression _ "," _ r:Expression ( _ "," _ f:Expression )? _ ")" {
      return { kind:"REGEXP_LIKE", args: [v, r].concat(f ? [f] : []) };
    }
  / _ op:CmpOp _ r:ValueExpr { return { kind:"COMPARE", op, right:r }; }

CmpOp
  = "=" / "<>" / "!=" / "<=" / ">=" / "<" / ">"

ValueExpr
  = Additive

Additive
  = left:Multiplicative rest:(_ ("+" / "-") _ Multiplicative)* {
      return rest.reduce((acc, r) => node("BinaryOp", { op:r[1], left:acc, right:r[3] }), left);
    }

Multiplicative
  = left:Unary rest:(_ ("*" / "/" / "%") _ Unary)* {
      return rest.reduce((acc, r) => node("BinaryOp", { op:r[1], left:acc, right:r[3] }), left);
    }

Unary
  = "+" _ u:Unary { return node("UnaryOp", { op:"+", expr:u }); }
  / "-" _ u:Unary { return node("UnaryOp", { op:"-", expr:u }); }
  / Primary

Primary
  = Literal
  / QualifiedName
  / FunctionCall
  / "CASE"i __ CaseExpr "END"i
  / "(" _ Expression _ ")"
  / ArrayLiteral
  / MapLiteral
  / StructLiteral
  / CastExpr
  / TryExpr
  / SubselectPrimary

SubselectPrimary
  = "(" _ q:Query _ ")" { return node("SubqueryExpr", { query:q }); }

CaseExpr
  = value:Expression? _ branches:WhenThen+ _ elsePart:ElsePart? {
      return node("Case", { value: value ?? null, whens: branches, else: elsePart ?? null });
    }

WhenThen
  = "WHEN"i __ c:Expression __ "THEN"i __ v:Expression { return { when:c, then:v }; }

ElsePart
  = "ELSE"i __ e:Expression { return e; }

FunctionCall
  = name:QualifiedName _ "(" _ args:StarOrDistinctArgs? _ ")" filter:FilterClause? over:OverClause? {
      return node("FunctionCall", { name, args: args ?? [], filter: filter ?? null, over: over ?? null });
    }

StarOrDistinctArgs
  = "*"                          { return [{ type:"StarArg" }]; }
  / "DISTINCT"i __ l:ExprList    { return [{ type:"DistinctArgs", args:l }]; }
  / l:ExprList                   { return l; }

FilterClause
  = _ "FILTER"i _ "(" _ "WHERE"i __ e:Expression _ ")" { return e; }

OverClause
  = _ "OVER"i _ spec:WindowSpec { return spec; }

CastExpr
  = "CAST"i _ "(" _ e:Expression _ "AS"i __ t:TypeSpec _ ")" {
      return node("Cast", { expr:e, type:t });
    }

TryExpr
  = "TRY"i _ "(" _ e:Expression _ ")" { return node("Try", { expr:e }); }

// ======================
// Literals & Types
// ======================

Literal
  = StringLiteral
  / NumericLiteral
  / "NULL"i     { return node("Null", {}); }
  / "TRUE"i     { return node("Boolean", { value:true }); }
  / "FALSE"i    { return node("Boolean", { value:false }); }
  / "INTERVAL"i __ s:StringLiteral __ u:Ident { return node("Interval", { value:s.value, unit:u }); }
  / DateTimeLiteral

DateTimeLiteral
  = "DATE"i __ s:StringLiteral      { return node("Date", { value:s.value }); }
  / "TIME"i __ s:StringLiteral      { return node("Time", { value:s.value }); }
  / "TIMESTAMP"i __ s:StringLiteral { return node("Timestamp", { value:s.value }); }

ArrayLiteral
  = "ARRAY"i _ "[" _ l:ExprList? _ "]" { return node("Array", { elements: l ?? [] }); }

MapLiteral
  = "MAP"i _ "(" _ pairs:KeyValueList _ ")" { return node("Map", { entries:pairs }); }

KeyValueList
  = first:KeyValue rest:(_ "," _ KeyValue)* { return list(first, rest); }

KeyValue
  = k:Expression _ "," _ v:Expression { return { key:k, value:v }; }

StructLiteral
  = "ROW"i _ "(" _ l:ExprList _ ")" { return node("Row", { fields:l }); }

NumericLiteral
  = n:Float   { return node("Number", { value:parseFloat(n) }); }
  / n:Integer { return node("Number", { value:parseInt(n,10) }); }

StringLiteral
  = "'" chars:("''" { return "'"; } / [^'])* "'" {
      return node("String", { value: chars.join("") });
    }

Integer
  = digits:[0-9]+ { return digits.join(""); }

Float
  = [0-9]+ "." [0-9]* ([eE] [+\-]? [0-9]+)? { return text(); }
  / "." [0-9]+ ([eE] [+\-]? [0-9]+)?       { return text(); }
  / [0-9]+ [eE] [+\-]? [0-9]+              { return text(); }

TypeSpec
  = SimpleType / ComplexType

SimpleType
  = "BOOLEAN"i  { return {name:"BOOLEAN"}; }
  / "TINYINT"i  { return {name:"TINYINT"}; }
  / "SMALLINT"i { return {name:"SMALLINT"}; }
  / "INT"i      { return {name:"INT"}; }
  / "INTEGER"i  { return {name:"INTEGER"}; }
  / "BIGINT"i   { return {name:"BIGINT"}; }
  / "REAL"i     { return {name:"REAL"}; }
  / "FLOAT"i    { return {name:"FLOAT"}; }
  / "DOUBLE"i   { return {name:"DOUBLE"}; }
  / "DECIMAL"i _ "(" _ p:Integer _ "," _ s:Integer _ ")" { return {name:"DECIMAL", precision:+p, scale:+s}; }
  / "VARCHAR"i _ "(" _ n:Integer _ ")" { return {name:"VARCHAR", length:+n}; }
  / "VARCHAR"i  { return {name:"VARCHAR"}; }
  / "CHAR"i _ "(" _ n:Integer _ ")" { return {name:"CHAR", length:+n}; }
  / "VARBINARY"i { return {name:"VARBINARY"}; }
  / "JSON"i     { return {name:"JSON"}; }
  / "DATE"i     { return {name:"DATE"}; }
  / "TIME"i     { return {name:"TIME"}; }
  / "TIMESTAMP"i { return {name:"TIMESTAMP"}; }

ComplexType
  = "ARRAY"i _ "(" _ t:TypeSpec _ ")" { return {name:"ARRAY", element:t}; }
  / "MAP"i _ "(" _ k:TypeSpec _ "," _ v:TypeSpec _ ")" { return {name:"MAP", key:k, value:v}; }
  / "ROW"i _ "(" _ fields:RowTypeFields _ ")" { return {name:"ROW", fields}; }

RowTypeFields
  = first:RowTypeField rest:(_ "," _ RowTypeField)* { return list(first, rest); }

RowTypeField
  = n:Ident _ t:TypeSpec { return { name:n, type:t }; }

// ======================
// Names & identifiers
// ======================

QualifiedName
  = first:Ident rest:(_ "." _ Ident)* {
      return node("Identifier", { name: qname(first, rest) });
    }

IdentList
  = first:Ident rest:(_ "," _ Ident)* { return list(first, rest); }

Ident
  = DQuotedIdent
  / BacktickIdent
  / UnquotedIdent

// double-quoted; "" escapes "
DQuotedIdent
  = '"' chars:('""' { return '"'; } / [^"])* '"' {
      return chars.join("");
    }

// backtick-quoted; `` escapes `
BacktickIdent
  = '`' chars:('``' { return '`'; } / [^`])* '`' {
      return chars.join("");
    }

// unquoted: start letter/_ ; continue letter/digit/_
UnquotedIdent
  = $([A-Za-z_][A-Za-z0-9_]*) { return text(); }

// ======================
// DDL (Hive-style in Athena)
// ======================

DDL
  = CreateDatabase
  / DropDatabase
  / CreateTable
  / DropTable
  / CreateView
  / DropView
  / AlterTable

UseStmt
  = "USE"i __ n:Ident { return node("Use", { database:n }); }

CreateDatabase
  = "CREATE DATABASE"i _ ifn:IfNotExists? n:Ident props:DbProperties? {
      return node("CreateDatabase", { name:n, ifNotExists: !!ifn, properties: props ?? {} });
    }

IfNotExists
  = "IF NOT EXISTS"i _

DbProperties
  = _ "WITH DBPROPERTIES"i _ "(" _ pairs:TblProperties _ ")" { return pairs; }

DropDatabase
  = "DROP DATABASE"i _ ife:IfExists? n:Ident (_ ("CASCADE"i / "RESTRICT"i))? {
      return node("DropDatabase", { name:n, ifExists: !!ife });
    }

IfExists
  = "IF EXISTS"i _

CreateTable
  = "CREATE"i __ ext:("EXTERNAL"i __)? "TABLE"i _ ifn:IfNotExists? name:TableName
      _ "(" _ cols:ColumnDefs _ ")"
      part:PartitionSpec? fmt:RowFormat? loc:LocationSpec? tblProps:TableProperties? asSelect:CreateTableAsSelect?
    {
      return node("CreateTable", {
        external: !!ext, ifNotExists: !!ifn, name,
        columns: cols, partitionedBy: part ?? null, rowFormat: fmt ?? null,
        location: loc ?? null, tableProperties: tblProps ?? null,
        asSelect: asSelect ?? null
      });
    }

CreateTableAsSelect
  = _ "AS"i _ q:Query { return q; }

ColumnDefs
  = first:ColumnDef rest:(_ "," _ ColumnDef)* { return list(first, rest); }

ColumnDef
  = n:Ident _ t:TypeSpec c:ColumnComment? { return { name:n, type:t, comment: c ?? null }; }

ColumnComment
  = _ "COMMENT"i __ s:StringLiteral { return s.value; }

PartitionSpec
  = _ "PARTITIONED BY"i _ "(" _ cols:ColumnDefs _ ")" { return cols; }

RowFormat
  = _ "ROW FORMAT SERDE"i __ s:QuotedString
      _ "WITH SERDEPROPERTIES"i _ "(" _ p:TblProperties _ ")" {
        return { serde: s, serdeProperties: p };
      }
  / _ "ROW FORMAT DELIMITED"i ( (!("LOCATION"i) .) )* { return { delimited: true, raw: text() }; }

LocationSpec
  = _ "LOCATION"i __ s:QuotedString { return s; }

TableProperties
  = _ "TBLPROPERTIES"i _ "(" _ p:TblProperties _ ")" { return p; }

TblProperties
  = first:TblProp rest:(_ "," _ TblProp)* { return Object.fromEntries([first, ...rest.map(r => r[3])]); }

TblProp
  = k:QuotedString _ "=" _ v:QuotedString { return [k, v]; }

QuotedString
  = s:StringLiteral { return s.value; }

DropTable
  = "DROP TABLE"i _ ife:IfExists? n:TableName {
      return node("DropTable", { name:n, ifExists: !!ife });
    }

AlterTable
  = "ALTER TABLE"i __ n:TableName __ a:AlterAction {
      return node("AlterTable", { name:n, action:a });
    }

AlterAction
  = "ADD PARTITION"i _ "(" _ p:TblProperties _ ")" { return { type:"ADD PARTITION", spec:p }; }
  / "RENAME TO"i __ newName:TableName            { return { type:"RENAME TO", name:newName }; }
  / "SET TBLPROPERTIES"i _ "(" _ t:TblProperties _ ")" { return { type:"SET TBLPROPERTIES", props:t }; }

CreateView
  = "CREATE OR REPLACE VIEW"i __ n:TableName _ "AS"i _ q:Query {
      return node("CreateView", { name:n, query:q, orReplace:true });
    }
  / "CREATE VIEW"i __ n:TableName _ "AS"i _ q:Query {
      return node("CreateView", { name:n, query:q, orReplace:false });
    }

DropView
  = "DROP VIEW"i _ ife:IfExists? n:TableName { return node("DropView", { name:n, ifExists: !!ife }); }

// ======================
// SHOW / DESCRIBE / MSCK
// ======================

ShowStmt
  = "SHOW TABLES"i (_ "IN"i __ db:Ident)? {
      return node("ShowTables", { database: db ?? null });
    }
  / "SHOW DATABASES"i { return node("ShowDatabases", {}); }
  / "SHOW COLUMNS FROM"i __ t:TableName { return node("ShowColumns", { table:t }); }
  / "SHOW PARTITIONS"i __ t:TableName { return node("ShowPartitions", { table:t }); }
  / "SHOW VIEWS"i (_ "IN"i __ db2:Ident)? {
      return node("ShowViews", { database: db2 ?? null });
    }
  / "SHOW CREATE TABLE"i __ t2:TableName { return node("ShowCreateTable", { table:t2 }); }
  / "SHOW CREATE VIEW"i __ v:TableName { return node("ShowCreateView", { view:v }); }

DescribeStmt
  = "DESCRIBE"i __ "VIEW"i __ v:TableName { return node("DescribeView", { target:v }); }
  / "DESCRIBE"i __ t:TableName { return node("Describe", { target:t }); }

MsckRepair
  = "MSCK REPAIR TABLE"i __ t:TableName { return node("MsckRepair", { table:t }); }

// ======================
// Whitespace & Comments
// ======================

_  = (WS / Comment)*
__ = (WS / Comment)+

WS = [ \t\r\n\f\v\u00A0]

Comment
  = LineComment / BlockComment

LineComment
  = "--" [^\n\r]*

BlockComment
  = "/*" (!"*/" .)* "*/"