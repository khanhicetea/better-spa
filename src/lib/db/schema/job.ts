import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobTable {
  id: Generated<string>;
  userId: string;
  type: string;
  label: string;
  status: ColumnType<JobStatus, JobStatus | undefined, JobStatus>;
  progress: ColumnType<number, number | undefined, number>;
  payload: unknown | null;
  result: unknown | null;
  error: string | null;
  retryCount: ColumnType<number, number | undefined, number>;
  maxRetries: ColumnType<number, number | undefined, number>;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}

export type Job = Selectable<JobTable>;
export type JobInsert = Insertable<JobTable>;
export type JobUpdate = Updateable<JobTable>;
