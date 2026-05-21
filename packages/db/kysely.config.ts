import { defineConfig } from "kysely-ctl";
import { getDatabasePooling } from "./src/client";

export default defineConfig({
  migrations: {
    migrationFolder: "./src/migrations",
    getMigrationPrefix: () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day}_${hour}-${minute}_`;
    },
  },
  kysely: getDatabasePooling(process.env.DATABASE_URL!),
});
