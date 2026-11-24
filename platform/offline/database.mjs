export async function openOwnedDatabase(namespace) {
  if (typeof namespace !== "string" || !/^[a-z0-9-]{1,80}$/.test(namespace))
    throw Error("Invalid project namespace");
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("commonplace-u8:" + namespace, 1);
    r.onupgradeneeded = () => {
      for (const name of ["packs", "documents", "files", "study", "sample"])
        r.result.createObjectStore(name, { keyPath: "key" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(
        Error(
          "Close older workspace tabs and retry. Saved work has been kept.",
        ),
      );
  });
  db.onversionchange = () => db.close();
  const transaction = (name, mode, work) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || Error("Storage transaction failed"));
      try {
        work(
          tx.objectStore(name),
          (v) => (result = v),
          tx,
          (error) => {
            tx.abort();
            reject(error);
          },
        );
      } catch (e) {
        tx.abort();
        reject(e);
      }
    });
  return {
    get: (name, key) =>
      transaction(name, "readonly", (store, done) => {
        const r = store.get(key);
        r.onsuccess = () => done(r.result?.data);
      }),
    all: (name) =>
      transaction(name, "readonly", (store, done) => {
        const r = store.getAll();
        r.onsuccess = () => done(r.result);
      }),
    owned: (name, owner) =>
      transaction(name, "readonly", (store, done) => {
        const prefix = JSON.stringify([owner]).slice(0, -1) + ",";
        const r = store.getAll(IDBKeyRange.bound(prefix, prefix + "\uffff"));
        r.onsuccess = () => done(r.result);
      }),
    update: (name, key, change) =>
      transaction(name, "readwrite", (store, done, tx, fail) => {
        const r = store.get(key);
        r.onsuccess = () => {
          try {
            const data = change(r.result?.data);
            if (data !== undefined) store.put({ key, data });
            done(data);
          } catch (e) {
            fail(e);
          }
        };
      }),
    put: (name, key, data) =>
      transaction(name, "readwrite", (store, done) => {
        store.put({ key, data });
        done(data);
      }),
    close: () => db.close(),
  };
}
export const ownedKey = (owner, ...parts) => JSON.stringify([owner, ...parts]);
