import type {
  DeleteQueryBuilder,
  DeleteResult,
  ExpressionBuilder,
  Insertable,
  Selectable,
  SelectQueryBuilder,
  Updateable,
  UpdateQueryBuilder,
} from "kysely";
import type { DB } from "../init";
import type { Database } from "../schema";
import type { Repositories } from ".";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type SelectQueryCondition<TTable extends keyof Database> =
  | Partial<Selectable<Database[TTable]>>
  | ((
      qb: SelectQueryBuilder<Database, TTable, object>,
    ) => SelectQueryBuilder<Database, TTable, object>);

export type QueryModifier<TTable extends keyof Database> = (
  qb: SelectQueryBuilder<Database, TTable, object>,
) => SelectQueryBuilder<Database, TTable, object>;

export type DeleteQueryCondition<TTable extends keyof Database> =
  | Partial<Selectable<Database[TTable]>>
  | ((
      qb: DeleteQueryBuilder<Database, TTable, DeleteResult>,
    ) => DeleteQueryBuilder<Database, TTable, DeleteResult>);

export type UpdateQueryCondition<TTable extends keyof Database> =
  | Partial<Selectable<Database[TTable]>>
  | ((
      qb: UpdateQueryBuilder<Database, TTable, TTable, object>,
    ) => UpdateQueryBuilder<Database, TTable, TTable, object>);

export interface BaseRepository<TTable extends keyof Database> {
  find(options?: {
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Selectable<Database[TTable]>[]>;
  findSelect<K extends keyof Selectable<Database[TTable]>>(options: {
    select: K[];
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Pick<Selectable<Database[TTable]>, K>[]>;
  findById(id: unknown): Promise<Selectable<Database[TTable]> | undefined>;
  findByIdOrFail(id: unknown): Promise<Selectable<Database[TTable]>>;
  findOne(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Selectable<Database[TTable]> | undefined>;
  findOneOrFail(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Selectable<Database[TTable]>>;
  findAll(
    queryBuilder?: QueryModifier<TTable>,
  ): Promise<Selectable<Database[TTable]>[]>;
  findPaginated(options: {
    page: number;
    pageSize: number;
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<{
    items: Selectable<Database[TTable]>[];
    totalCount: number;
    pageCount: number;
    page: number;
    pageSize: number;
  }>;
  count(conditions?: SelectQueryCondition<TTable>): Promise<number>;
  exists(id: unknown): Promise<boolean>;
  existsBy(conditions: SelectQueryCondition<TTable>): Promise<boolean>;
  deleteById(id: unknown): Promise<DeleteResult[]>;
  deleteMany(conditions: DeleteQueryCondition<TTable>): Promise<DeleteResult[]>;
  updateById(options: {
    id: unknown;
    data: Updateable<Database[TTable]>;
  }): Promise<Selectable<Database[TTable]> | undefined>;
  updateMany(options: {
    where: UpdateQueryCondition<TTable>;
    data: Updateable<Database[TTable]>;
  }): Promise<Selectable<Database[TTable]>[]>;
  insertReturn(
    data: Insertable<Database[TTable]>,
  ): Promise<Selectable<Database[TTable]> | undefined>;
  insertMany(
    data: Insertable<Database[TTable]>[],
  ): Promise<Selectable<Database[TTable]>[]>;
  upsert(options: {
    data: Insertable<Database[TTable]>;
    conflictColumns: (keyof Selectable<Database[TTable]>)[];
    updateData?: Partial<Insertable<Database[TTable]>>;
  }): Promise<Selectable<Database[TTable]> | undefined>;
}

export class Repository<TTable extends keyof Database>
  implements BaseRepository<TTable>
{
  protected _repos: Repositories | null = null;

  constructor(
    protected db: DB,
    protected tableName: TTable,
  ) {}

  /**
   * Set the repos reference for cross-repository access.
   * Called by createRepos after all repositories are instantiated.
   */
  setRepos(repos: Repositories): void {
    this._repos = repos;
  }

  /**
   * Access other repositories. Throws if repos not yet initialized.
   */
  protected get repos(): Repositories {
    if (!this._repos) {
      throw new Error(
        "Repos not initialized. Make sure createRepos() was called.",
      );
    }
    return this._repos;
  }

  protected applyConditions<Q>(
    query: Q,
    conditions?:
      | SelectQueryCondition<TTable>
      | DeleteQueryCondition<TTable>
      | UpdateQueryCondition<TTable>,
  ): Q {
    if (!conditions) return query;

    if (typeof conditions === "function") {
      return conditions(query as any) as Q;
    }

    let result = query;
    if (Object.keys(conditions).length > 0) {
      for (const [key, value] of Object.entries(conditions)) {
        result = (result as any).where(key, "=", value);
      }
    }

    return result as Q;
  }

  async find(options?: {
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Selectable<Database[TTable]>[]> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applyConditions(query, options?.where);
    if (options?.modify) {
      query = options.modify(query as any) as any;
    }

    return query
      .selectAll()
      .execute()
      .then((rows) => rows as Selectable<Database[TTable]>[]);
  }

  async findSelect<K extends keyof Selectable<Database[TTable]>>(options: {
    select: K[];
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Pick<Selectable<Database[TTable]>, K>[]> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applyConditions(query, options.where);
    if (options.modify) {
      query = options.modify(query as any) as any;
    }

    const rows = await (query as any).select(options.select).execute();
    return rows as Pick<Selectable<Database[TTable]>, K>[];
  }

  async findById(
    id: unknown,
  ): Promise<Selectable<Database[TTable]> | undefined> {
    const row = await (this.db.selectFrom(this.tableName) as any)
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst();

    return row as Selectable<Database[TTable]> | undefined;
  }

  async findByIdOrFail(id: unknown): Promise<Selectable<Database[TTable]>> {
    const record = await this.findById(id);
    if (!record) {
      throw new NotFoundError(
        `${String(this.tableName)} with id ${String(id)} not found`,
      );
    }
    return record;
  }

  async findOne(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Selectable<Database[TTable]> | undefined> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applyConditions(query, options.where);
    if (options.modify) {
      query = options.modify(query as any) as any;
    }

    const row = await query.selectAll().executeTakeFirst();
    return row as Selectable<Database[TTable]> | undefined;
  }

  async findOneOrFail(options: {
    where: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<Selectable<Database[TTable]>> {
    const record = await this.findOne(options);
    if (!record) {
      throw new NotFoundError(`${String(this.tableName)} record not found`);
    }
    return record;
  }

  async findAll(
    queryBuilder?: QueryModifier<TTable>,
  ): Promise<Selectable<Database[TTable]>[]> {
    let query = this.db.selectFrom(this.tableName);
    if (queryBuilder) {
      query = queryBuilder(query as any) as any;
    }

    const rows = await query.selectAll().execute();
    return rows as Selectable<Database[TTable]>[];
  }

  async findPaginated(options: {
    page: number;
    pageSize: number;
    where?: SelectQueryCondition<TTable>;
    modify?: QueryModifier<TTable>;
  }): Promise<{
    items: Selectable<Database[TTable]>[];
    totalCount: number;
    pageCount: number;
    page: number;
    pageSize: number;
  }> {
    const offset = (options.page - 1) * options.pageSize;

    let query = this.db.selectFrom(this.tableName);
    query = this.applyConditions(query, options.where);
    if (options.modify) {
      query = options.modify(query as any) as any;
    }

    const [items, totalCount] = await Promise.all([
      query
        .selectAll()
        .limit(options.pageSize)
        .offset(offset)
        .execute()
        .then((rows) => rows as Selectable<Database[TTable]>[]),
      this.count(options.where), // Only pass where conditions, NOT modify
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
    query = this.applyConditions(query, conditions);

    const result = await (query as any)
      .select((eb: ExpressionBuilder<Database, TTable>) => [
        eb.fn.count("id").as("count"),
      ])
      .executeTakeFirst();

    return Number(result?.count) ?? 0;
  }

  async exists(id: unknown): Promise<boolean> {
    const row = await (this.db.selectFrom(this.tableName) as any)
      .select((eb: ExpressionBuilder<Database, TTable>) =>
        eb.lit(1).as("exists"),
      )
      .where("id", "=", id)
      .limit(1)
      .executeTakeFirst();

    return !!row;
  }

  async existsBy(conditions: SelectQueryCondition<TTable>): Promise<boolean> {
    let query = this.db.selectFrom(this.tableName);
    query = this.applyConditions(query, conditions);

    const row = await (query as any)
      .select((eb: ExpressionBuilder<Database, TTable>) =>
        eb.lit(1).as("exists"),
      )
      .limit(1)
      .executeTakeFirst();

    return !!row;
  }

  async deleteById(id: unknown): Promise<DeleteResult[]> {
    const result = await (this.db.deleteFrom(this.tableName) as any)
      .where("id", "=", id)
      .execute();

    return result;
  }

  async deleteMany(
    conditions: DeleteQueryCondition<TTable>,
  ): Promise<DeleteResult[]> {
    let query = this.db.deleteFrom(this.tableName);
    query = this.applyConditions(query, conditions);

    return query.execute();
  }

  async updateById(options: {
    id: unknown;
    data: Updateable<Database[TTable]>;
  }): Promise<Selectable<Database[TTable]> | undefined> {
    const row = await (this.db.updateTable(this.tableName) as any)
      .set(options.data)
      .where("id", "=", options.id)
      .returningAll()
      .executeTakeFirst();

    return row as Selectable<Database[TTable]> | undefined;
  }

  async updateMany(options: {
    where: UpdateQueryCondition<TTable>;
    data: Updateable<Database[TTable]>;
  }): Promise<Selectable<Database[TTable]>[]> {
    let query = (this.db.updateTable(this.tableName) as any).set(options.data);
    query = this.applyConditions(query, options.where);

    const rows = await query.returningAll().execute();
    return rows as Selectable<Database[TTable]>[];
  }

  async insertReturn(
    data: Insertable<Database[TTable]>,
  ): Promise<Selectable<Database[TTable]> | undefined> {
    const row = await this.db
      .insertInto(this.tableName)
      .values(data as any)
      .returningAll()
      .executeTakeFirst();

    return row as Selectable<Database[TTable]> | undefined;
  }

  async insertMany(
    data: Insertable<Database[TTable]>[],
  ): Promise<Selectable<Database[TTable]>[]> {
    const rows = await this.db
      .insertInto(this.tableName)
      .values(data as any)
      .returningAll()
      .execute();

    return rows as Selectable<Database[TTable]>[];
  }

  async upsert(options: {
    data: Insertable<Database[TTable]>;
    conflictColumns: (keyof Selectable<Database[TTable]>)[];
    updateData?: Partial<Insertable<Database[TTable]>>;
  }): Promise<Selectable<Database[TTable]> | undefined> {
    const dataToUpdate = options.updateData ?? options.data;

    const row = await this.db
      .insertInto(this.tableName)
      .values(options.data as any)
      .onConflict((oc) =>
        oc
          .columns(options.conflictColumns as any)
          .doUpdateSet(dataToUpdate as any),
      )
      .returningAll()
      .executeTakeFirst();

    return row as Selectable<Database[TTable]> | undefined;
  }
}
