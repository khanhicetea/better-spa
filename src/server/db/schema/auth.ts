import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface UserTable {
  id: Generated<string>;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}

export type User = Selectable<UserTable>;
export type UserInsert = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;

export interface SessionTable {
  id: Generated<string>;
  expiresAt: Date;
  token: string;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
  impersonatedBy: string | null;
}

export type Session = Selectable<SessionTable>;
export type SessionInsert = Insertable<SessionTable>;
export type SessionUpdate = Updateable<SessionTable>;

export interface AccountTable {
  id: Generated<string>;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}

export type Account = Selectable<AccountTable>;
export type AccountInsert = Insertable<AccountTable>;
export type AccountUpdate = Updateable<AccountTable>;

export interface VerificationTable {
  id: Generated<string>;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}

export type Verification = Selectable<VerificationTable>;
export type VerificationInsert = Insertable<VerificationTable>;
export type VerificationUpdate = Updateable<VerificationTable>;
