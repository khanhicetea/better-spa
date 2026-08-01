import type { InferSelectModel, SQL } from "drizzle-orm";
import type { AnyPgTable, PgInsertValue, PgTable, PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { DB } from "../client";

/**
 * Shared, protected building blocks for focused repositories.
 *
 * Concrete repositories remain responsible for their public API, predicates, and
 * narrow mutation types. In particular, ownership-sensitive tables should only
 * expose methods whose predicates include the owner ID.
 */
export abstract class BaseRepository<
  TTable extends AnyPgTable,
  TInsert extends PgInsertValue<TTable> = PgInsertValue<TTable>,
  TUpdate extends PgUpdateSetSource<TTable> = PgUpdateSetSource<TTable>,
> {
  protected constructor(
    protected readonly db: DB,
    protected readonly table: TTable,
  ) {}

  private assertScoped(where: SQL | undefined): asserts where is SQL {
    if (!where) throw new Error("BaseRepository requires a scoped predicate");
  }

  private resultRows<TResult>(rows: unknown): TResult[] {
    // Drizzle 1.0 RC widens results for generic table parameters. Keep that
    // compatibility assertion contained here while preserving concrete return types.
    return rows as TResult[];
  }

  private firstRow<TResult>(rows: unknown): TResult | undefined {
    return this.resultRows<TResult>(rows)[0];
  }

  protected async findOne(where: SQL | undefined): Promise<InferSelectModel<TTable> | undefined> {
    this.assertScoped(where);
    const rows = await this.db
      .select()
      .from(this.table as PgTable)
      .where(where)
      .limit(1);
    return this.firstRow<InferSelectModel<TTable>>(rows);
  }

  protected async insertOne(data: TInsert): Promise<InferSelectModel<TTable> | undefined> {
    const rows = await this.db.insert(this.table).values(data).returning();
    return this.firstRow<InferSelectModel<TTable>>(rows);
  }

  protected async insertMany(data: readonly TInsert[]): Promise<InferSelectModel<TTable>[]> {
    if (data.length === 0) throw new Error("BaseRepository requires at least one row to insert");
    const rows = await this.db
      .insert(this.table)
      .values([...data])
      .returning();
    return this.resultRows<InferSelectModel<TTable>>(rows);
  }

  protected async updateOne(
    where: SQL | undefined,
    data: TUpdate,
  ): Promise<InferSelectModel<TTable> | undefined> {
    this.assertScoped(where);
    const rows = await this.db.update(this.table).set(data).where(where).returning();
    return this.firstRow<InferSelectModel<TTable>>(rows);
  }

  protected async deleteOne(where: SQL | undefined): Promise<InferSelectModel<TTable> | undefined> {
    this.assertScoped(where);
    const rows = await this.db.delete(this.table).where(where).returning();
    return this.firstRow<InferSelectModel<TTable>>(rows);
  }
}
