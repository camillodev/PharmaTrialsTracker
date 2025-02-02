
import { db } from "./index";
import { sql } from "drizzle-orm";

async function resetDatabase() {
  try {
    console.log("Starting database reset...");

    // Drop all tables in reverse order of dependencies
    await db.execute(sql`
      DROP TABLE IF EXISTS medication_events CASCADE;
      DROP TABLE IF EXISTS outlier_logs CASCADE;
      DROP TABLE IF EXISTS lab_results CASCADE;
      DROP TABLE IF EXISTS symptoms CASCADE;
      DROP TABLE IF EXISTS patients CASCADE;
      DROP TABLE IF EXISTS trials CASCADE;
    `);

    console.log("Tables dropped successfully");
    console.log("Run 'npm run db:push' to recreate tables");
    
    process.exit(0);
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  }
}

resetDatabase();
