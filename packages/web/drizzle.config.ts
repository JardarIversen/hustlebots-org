import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js uses .env.local, but drizzle-kit doesn't auto-load it
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
