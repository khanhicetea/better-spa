import type {
  DeleteQueryBuilder,
  DeleteResult,
  Insertable,
  Selectable,
  SelectQueryBuilder,
  Updateable,
  UpdateQueryBuilder,
} from "kysely";
import type { Database } from "../schema";

// ---------------------------------------------------------------------------
// Row-level helpers
// ---------------------------------------------------------------------------

export type TableRow<TTable extends keyof Database> = Selectable<Database[TTable]>;
export type TableInsert<TTable extends keyof Database> = Insertable<Database[TTable]>;
export type TableUpdate<TTable extends keyof Database> = Updateable<Database[TTable]>;

export type IdOf<TTable extends keyof Database> =
  TableRow<TTable> extends {
    id: infer TId;
  }
    ? TId
    : never;

// ---------------------------------------------------------------------------
// Query condition / modifier types
// ---------------------------------------------------------------------------

export type SelectQueryCondition<TTable extends keyof Database> =
  | Partial<TableRow<TTable>>
  | ((
      qb: SelectQueryBuilder<Database, TTable, object>,
    ) => SelectQueryBuilder<Database, TTable, object>);

export type QueryModifier<TTable extends keyof Database> = (
  qb: SelectQueryBuilder<Database, TTable, object>,
) => SelectQueryBuilder<Database, TTable, object>;

export type DeleteQueryCondition<TTable extends keyof Database> =
  | Partial<TableRow<TTable>>
  | ((
      qb: DeleteQueryBuilder<Database, TTable, DeleteResult>,
    ) => DeleteQueryBuilder<Database, TTable, DeleteResult>);

export type UpdateQueryCondition<TTable extends keyof Database> =
  | Partial<TableRow<TTable>>
  | ((
      qb: UpdateQueryBuilder<Database, TTable, TTable, object>,
    ) => UpdateQueryBuilder<Database, TTable, TTable, object>);

// ---------------------------------------------------------------------------
// Paginated result
// ---------------------------------------------------------------------------

export interface PaginatedResult<TTable extends keyof Database> {
  items: TableRow<TTable>[];
  totalCount: number;
  pageCount: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// BaseRepository interface
// ---------------------------------------------------------------------------

export interface BaseRepository<TTable extends keyof Database> {
  find(options?: {
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<TableRow<TTable>[]>;
  findSelect<K extends keyof TableRow<TTable>>(options: {
    select: K[];
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Pick<TableRow<TTable>, K>[]>;
  findById(id: IdOf<TTable>): Promise<TableRow<TTable> | undefined>;
  findByIdOrFail(id: IdOf<TTable>): Promise<TableRow<TTable>>;
  findOne(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<TableRow<TTable> | undefined>;
  findOneOrFail(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<TableRow<TTable>>;
  findAll(queryBuilder?: QueryModifier<TTable>): Promise<TableRow<TTable>[]>;
  findPaginated(options: {
    page: number;
    pageSize: number;
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<PaginatedResult<TTable>>;
  count(conditions?: SelectQueryCondition<TTable>): Promise<number>;
  exists(id: IdOf<TTable>): Promise<boolean>;
  existsBy(conditions: SelectQueryCondition<TTable>): Promise<boolean>;
  deleteById(id: IdOf<TTable>): Promise<DeleteResult[]>;
  deleteMany(conditions: DeleteQueryCondition<TTable>): Promise<DeleteResult[]>;
  updateById(options: {
    id: IdOf<TTable>;
    data: TableUpdate<TTable>;
  }): Promise<TableRow<TTable> | undefined>;
  updateMany(options: {
    where: UpdateQueryCondition<TTable>;
    data: TableUpdate<TTable>;
  }): Promise<TableRow<TTable>[]>;
  insertReturn(data: TableInsert<TTable>): Promise<TableRow<TTable> | undefined>;
  insertMany(data: TableInsert<TTable>[]): Promise<TableRow<TTable>[]>;
  upsert(options: {
    data: TableInsert<TTable>;
    conflictColumns: (keyof TableRow<TTable>)[];
    updateData?: Partial<TableInsert<TTable>>;
  }): Promise<TableRow<TTable> | undefined>;
}
