import {
  boolean,
  foreignKey,
  index,
  pgTableCreator,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const table = pgTableCreator((name) => name, "snake_case");
const timestamptz = () => timestamp({ withTimezone: true, mode: "date" });

export const user = table(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: text(),
    banned: boolean().default(false),
    banReason: text(),
    banExpires: timestamptz(),
    createdAt: timestamptz().notNull().defaultNow(),
    updatedAt: timestamptz().notNull().defaultNow(),
    timezone: text(),
    username: text(),
  },
  (table) => [
    uniqueIndex("idx_user_email").on(table.email),
    uniqueIndex("idx_user_username").on(table.username),
  ],
);

export const session = table(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamptz().notNull(),
    token: text().notNull(),
    createdAt: timestamptz().notNull().defaultNow(),
    updatedAt: timestamptz().notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull(),
    impersonatedBy: text(),
  },
  (table) => [
    unique("session_token_key").on(table.token),
    index("idx_session_user_id").on(table.userId),
    index("idx_session_expires_at").on(table.expiresAt),
    foreignKey({
      name: "session_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [user.id],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const account = table(
  "account",
  {
    id: text().primaryKey(),
    issuer: text().notNull(),
    providerAccountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamptz(),
    refreshTokenExpiresAt: timestamptz(),
    scope: text(),
    password: text(),
    createdAt: timestamptz().notNull().defaultNow(),
    updatedAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_account_issuer_provider_account").on(table.issuer, table.providerAccountId),
    index("idx_account_user_id").on(table.userId),
    foreignKey({
      name: "account_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [user.id],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const verification = table(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamptz().notNull(),
    createdAt: timestamptz().notNull().defaultNow(),
    updatedAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)],
);

export type User = typeof user.$inferSelect;
export type UserInsert = typeof user.$inferInsert;
export type UserUpdate = Partial<Pick<User, "name" | "username" | "timezone" | "updatedAt">>;
export type Session = typeof session.$inferSelect;
export type SessionInsert = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type AccountInsert = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type VerificationInsert = typeof verification.$inferInsert;
