import { canonical } from "./lease.mjs";

// One contract for export, decoded imports and the file-picker preflight. Keep
// version 1 readable; fail before offering a download rather than truncate work.
export const STUDY_BACKUP_LIMITS = Object.freeze({
  records: 10000,
  bytes: 32 * 1024 * 1024,
  alternatives: 10000,
});

export function assertStudyBackupBytes(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw Error("Invalid study backup size.");
  if (bytes > STUDY_BACKUP_LIMITS.bytes)
    throw Error("Study backup exceeds 32 MiB. No data has been removed.");
}

export function studyBackupCopies(record) {
  const copies = [];
  const add = (value) => {
    if (copies.length >= STUDY_BACKUP_LIMITS.alternatives)
      throw Error(
        "Study backup exceeds 10,000 alternative versions for one record. No data has been removed.",
      );
    copies.push(value);
  };
  const array = (value) => {
    if (value == null) return [];
    if (!Array.isArray(value)) throw Error("Invalid backup history.");
    return value;
  };
  const conflicts = (values) => {
    for (const copy of array(values)) {
      if (!copy || typeof copy !== "object" || !("value" in copy))
        throw Error("Invalid backup history.");
      if (copy.value !== null) add(copy.value);
    }
  };
  conflicts(record.conflicts);
  for (const history of array(record.history)) {
    if (!history || typeof history !== "object" || !("value" in history))
      throw Error("Invalid backup history.");
    add(history.value);
    conflicts(history.conflicts);
  }
  // An in-flight write and its last known cloud value may differ from the latest
  // edit. Preserve their values only; imported revisions/operation IDs are inert.
  for (const value of [record.pending?.value, record.base_value]) {
    if (value != null && canonical(value) !== canonical(record.value))
      add(value);
  }
  return copies;
}

export function assertStudyBackupRecords(records) {
  if (!Array.isArray(records)) throw Error("Invalid study backup records.");
  if (records.length > STUDY_BACKUP_LIMITS.records)
    throw Error(
      "Study backup exceeds 10,000 records. No data has been removed.",
    );
  for (const record of records) {
    if (!record || typeof record !== "object")
      throw Error("Invalid backup record.");
    studyBackupCopies(record);
  }
}
