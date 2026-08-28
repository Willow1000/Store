import { describe, expect, it } from "vitest";
import { checkDatabaseHealth, isDatabaseConfigured } from "./db";

describe("checkDatabaseHealth", () => {
  it("returns a boolean without throwing regardless of configuration", async () => {
    const result = await checkDatabaseHealth();
    expect(typeof result).toBe("boolean");
  });

  it("returns true when DATABASE_URL points to a reachable database", async () => {
    if (!isDatabaseConfigured()) {
      // No DATABASE_URL in this environment (e.g. a contributor running
      // tests without docker-compose's local Postgres up) - the other
      // assertion above already covers the no-database path.
      return;
    }
    await expect(checkDatabaseHealth()).resolves.toBe(true);
  });
});
