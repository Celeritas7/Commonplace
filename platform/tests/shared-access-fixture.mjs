// Synthetic fixture for isolated tests only; never included in staging packages.
import { readFile } from "node:fs/promises";
export const preHardeningLegacyFixture = await readFile(
  new URL("./shared-access-fixture.sql", import.meta.url),
  "utf8",
);
const hardenedAuth = await readFile(
  new URL("./shared-auth-hardened-fixture.sql", import.meta.url),
  "utf8",
);
export const legacyFixture = preHardeningLegacyFixture + "\n" + hardenedAuth;
