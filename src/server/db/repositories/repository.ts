import type {
  DeleteQueryBuilder,
  DeleteResult,
  ExpressionBuilder,
  SelectQueryBuilder,
  UpdateQueryBuilder,
} from "kysely";
import type { DB } from "../client";
import type { Database } from "../schema";
import type { Repositories } from ".";
import type {
  BaseRepository,
  DeleteQueryCondition,
  IdOf,
  PaginatedResult,
  QueryModifier,
  SelectQueryCondition,
  TableInsert,
  TableRow,
  TableUpdate,
  UpdateQueryCondition,
} from "./types";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class Repository<TTable extends keyof Database> implements BaseRepository<TTable> {
  protected _repos: Repositories | null = null;

  constructor(
    protected db: DB,
    protected tableName: TTable,
  ) {}

  setRepos(repos: Repositories): void {
    this._repos = repos;
  }

  protected get repos(): Repositories {
    if (!this._repos) {
      throw new Error("Repos not initialized. Make sure createRepos() was called.");
    }
    return this._repos;
  }

  protected applySelectConditions<Q extends SelectQueryBuilder<Database, any, any>>(
    query: Q,
    conditions?: SelectQueryCondition<TTable>,
  ): Q {
    if (!conditions) return query;

    if (typeof conditions === "function") {
      return conditions(
        query as unknown as SelectQueryBuilder<Database, TTable, object>,
      ) as unknown as Q;
    }

    let result = query;
    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined) continue;
      result = (result as unknown as SelectQueryBuilder<Database, TTable, object>).where(
        key as never,
        "=",
        value as never,
      ) as unknown as Q;
    }

    return result;
  }

  protected applyDeleteConditions<Q extends DeleteQueryBuilder<Database, any, any>>(
    query: Q,
    conditions?: DeleteQueryCondition<TTable>,
  ): Q {
    if (!conditions) return query;

    if (typeof conditions === "function") {
      return conditions(
        query as unknown as DeleteQueryBuilder<Database, TTable, DeleteResult>,
      ) as unknown as Q;
    }

    let result = query;
    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined) continue;
      result = (result as unknown as DeleteQueryBuilder<Database, TTable, DeleteResult>).where(
        key as never,
        "=",
        value as never,
      ) as unknown as Q;
    }

    return result;
  }

  protected applyUpdateConditions<Q extends UpdateQueryBuilder<Database, any, any, any>>(
    query: Q,
    conditions?: UpdateQueryCondition<TTable>,
  ): Q {
    if (!conditions) return query;

    if (typeof conditions === "function") {
      return conditions(
        query as unknown as UpdateQueryBuilder<Database, TTable, TTable, object>,
      ) as unknown as Q;
    }

    let result = query;
    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined) continue;
      result = (result as unknown as UpdateQueryBuilder<Database, TTable, TTable, object>).where(
        key as never,
        "=",
        value as never,
      ) as unknown as Q;
    }

    return result;
  }

  async find(options?: {
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<TableRow<TTable>[]> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applySelectConditions(query, options?.where);
    if (options?.modify) {
      query = options.modify(
        query as unknown as SelectQueryBuilder<Database, TTable, object>,
      ) as unknown as typeof query;
    }

    return query
      .selectAll()
      .execute()
      .then((rows) => rows as TableRow<TTable>[]);
  }

  async findSelect<K extends keyof TableRow<TTable>>(options: {
    select: K[];
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Pick<TableRow<TTable>, K>[]> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applySelectConditions(query, options.where);
    if (options.modify) {
      query = options.modify(
        query as unknown as SelectQueryBuilder<Database, TTable, object>,
      ) as unknown as typeof query;
    }

    const rows = await (query as unknown as SelectQueryBuilder<Database, TTable, object>)
      .select(options.select as never)
      .execute();
    return rows as Pick<TableRow<TTable>, K>[];
  }

  async findById(id: IdOf<TTable>): Promise<TableRow<TTable> | undefined> {
    const row = await (
      this.db.selectFrom(this.tableName) as unknown as SelectQueryBuilder<Database, TTable, object>
    )
      .where("id" as never, "=", id as never)
      .selectAll()
      .executeTakeFirst();

    return row as TableRow<TTable> | undefined;
  }

  async findByIdOrFail(id: IdOf<TTable>): Promise<TableRow<TTable>> {
    const record = await this.findById(id);
    if (!record) {
      throw new NotFoundError(`${String(this.tableName)} with id ${String(id)} not found`);
    }
    return record;
  }

  async findOne(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<TableRow<TTable> | undefined> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applySelectConditions(query, options.where);
    if (options.modify) {
      query = options.modify(
        query as unknown as SelectQueryBuilder<Database, TTable, object>,
      ) as unknown as typeof query;
    }

    const row = await query.selectAll().executeTakeFirst();
    return row as TableRow<TTable> | undefined;
  }

  async findOneOrFail(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<TableRow<TTable>> {
    const record = await this.findOne(options);
    if (!record) {
      throw new NotFoundError(`${String(this.tableName)} record not found`);
    }
    return record;
  }

  async findAll(queryBuilder?: QueryModifier<TTable>): Promise<TableRow<TTable>[]> {
    let query = this.db.selectFrom(this.tableName);
    if (queryBuilder) {
      query = queryBuilder(
        query as unknown as SelectQueryBuilder<Database, TTable, object>,
      ) as unknown as typeof query;
    }

    const rows = await query.selectAll().execute();
    return rows as TableRow<TTable>[];
  }

  async findPaginated(options: {
    page: number;
    pageSize: number;
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<PaginatedResult<TTable>> {
    const offset = (options.page - 1) * options.pageSize;

    let query = this.db.selectFrom(this.tableName);
    query = this.applySelectConditions(query, options.where);
    if (options.modify) {
      query = options.modify(
        query as unknown as SelectQueryBuilder<Database, TTable, object>,
      ) as unknown as typeof query;
    }

    const [items, totalCount] = await Promise.all([
      query
        .selectAll()
        .limit(options.pageSize)
        .offset(offset)
        .execute()
        .then((rows) => rows as TableRow<TTable>[]),
      this.count(options.where),
    ]);

    const pageCount = Math.ceil(totalCount / options.pageSize);

    return {
      items,
      totalCount,
      pageCount,
      page: options.page,
      pageSize: options.pageSize,
    };
  }

  async count(conditions?: SelectQueryCondition<TTable>): Promise<number> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applySelectConditions(query, conditions);

    const result = await (query as unknown as SelectQueryBuilder<Database, TTable, object>)
      .select((eb: ExpressionBuilder<Database, TTable>) => [eb.fn.count("id").as("count")])
      .executeTakeFirst();

    return Number(result?.count) ?? 0;
  }

  async exists(id: IdOf<TTable>): Promise<boolean> {
    const row = await (
      this.db.selectFrom(this.tableName) as unknown as SelectQueryBuilder<Database, TTable, object>
    )
      .select((eb: ExpressionBuilder<Database, TTable>) => eb.lit(1).as("exists"))
      .where("id" as never, "=", id as never)
      .limit(1)
      .executeTakeFirst();

    return !!row;
  }

  async existsBy(conditions: SelectQueryCondition<TTable>): Promise<boolean> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applySelectConditions(query, conditions);

    const row = await (query as unknown as SelectQueryBuilder<Database, TTable, object>)
      .select((eb: ExpressionBuilder<Database, TTable>) => eb.lit(1).as("exists"))
      .limit(1)
      .executeTakeFirst();

    return !!row;
  }

  async deleteById(id: IdOf<TTable>): Promise<DeleteResult[]> {
    return (
      this.db.deleteFrom(this.tableName) as unknown as DeleteQueryBuilder<
        Database,
        TTable,
        DeleteResult
      >
    )
      .where("id" as never, "=", id as never)
      .execute();
  }

  async deleteMany(conditions: DeleteQueryCondition<TTable>): Promise<DeleteResult[]> {
    let query = this.db.deleteFrom(this.tableName);
    query = this.applyDeleteConditions(query, conditions);

    return query.execute();
  }

  async updateById(options: {
    id: IdOf<TTable>;
    data: TableUpdate<TTable>;
  }): Promise<TableRow<TTable> | undefined> {
    const row = await (
      this.db.updateTable(this.tableName) as unknown as UpdateQueryBuilder<
        Database,
        TTable,
        TTable,
        object
      >
    )
      .set(options.data as never)
      .where("id" as never, "=", options.id as never)
      .returningAll()
      .executeTakeFirst();

    return row as TableRow<TTable> | undefined;
  }

  async updateMany(options: {
    where: UpdateQueryCondition<TTable>;
    data: TableUpdate<TTable>;
  }): Promise<TableRow<TTable>[]> {
    let query = (
      this.db.updateTable(this.tableName) as unknown as UpdateQueryBuilder<
        Database,
        TTable,
        TTable,
        object
      >
    ).set(options.data as never);
    query = this.applyUpdateConditions(query, options.where);

    const rows = await query.returningAll().execute();
    return rows as TableRow<TTable>[];
  }

  async insertReturn(data: TableInsert<TTable>): Promise<TableRow<TTable> | undefined> {
    const row = await this.db
      .insertInto(this.tableName)
      .values(data)
      .returningAll()
      .executeTakeFirst();

    return row as TableRow<TTable> | undefined;
  }

  async insertMany(data: TableInsert<TTable>[]): Promise<TableRow<TTable>[]> {
    const rows = await this.db.insertInto(this.tableName).values(data).returningAll().execute();

    return rows as TableRow<TTable>[];
  }

  async upsert(options: {
    data: TableInsert<TTable>;
    conflictColumns: (keyof TableRow<TTable>)[];
    updateData?: Partial<TableInsert<TTable>>;
  }): Promise<TableRow<TTable> | undefined> {
    const dataToUpdate = options.updateData ?? options.data;

    const row = await this.db
      .insertInto(this.tableName)
      .values(options.data)
      .onConflict((oc) =>
        oc.columns(options.conflictColumns as never).doUpdateSet(dataToUpdate as never),
      )
      .returningAll()
      .executeTakeFirst();

    return row as TableRow<TTable> | undefined;
  }
}
