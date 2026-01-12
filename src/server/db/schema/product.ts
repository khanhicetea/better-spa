import type {
  ColumnType,
  Insertable,
  JSONColumnType,
  Selectable,
  Updateable,
} from "kysely";
import type { PrivateS3Files } from "@/lib/schemas/s3";

export interface ProductTable {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  images: PrivateS3Files | null;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}

export type Product = Selectable<ProductTable>;
export type ProductInsert = Insertable<ProductTable>;
export type ProductUpdate = Updateable<ProductTable>;
