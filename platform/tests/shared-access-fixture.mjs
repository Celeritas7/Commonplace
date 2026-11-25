// Synthetic fixture for isolated tests only; never included in staging packages.
import { readFile } from "node:fs/promises";
export const legacyFixture = await readFile(
  new URL("./shared-access-fixture.sql", import.meta.url),
  "utf8",
);
