// Existing packs and work keep their original owner keys. Only the selector
// changes. A separate lock ID prevents an older in-flight verification in
// another tab from making its selector valid after an account boundary.
export function createSavedOwner(storage, namespace) {
  const key = "cp:u8:" + namespace + ":saved-owner";
  const lockKey = key + ":lock";
  const lockId = () => storage.getItem(lockKey);
  function read() {
    try {
      const marker = JSON.parse(storage.getItem(key));
      if (
        marker?.unlocked === true &&
        typeof marker.owner === "string" &&
        (marker.lockId ?? null) === lockId()
      )
        return marker;
    } catch {
      // A missing or unreadable selector cannot open saved study.
    }
    return null;
  }
  function lock() {
    // Shrinking the old marker can free space on a nearly full device. Try
    // both writes so either successful invalidation protects the new reader.
    try {
      storage.setItem(key, JSON.stringify({ unlocked: false }));
    } finally {
      storage.setItem(lockKey, crypto.randomUUID());
    }
  }
  function select(owner, verifiedUnder) {
    if (lockId() !== verifiedUnder) throw Error("Account changed");
    storage.setItem(
      key,
      JSON.stringify({ owner, unlocked: true, lockId: verifiedUnder }),
    );
  }
  return { key, lockKey, lockId, read, lock, select };
}
