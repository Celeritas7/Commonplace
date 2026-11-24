export function memoryDatabase() {
  const tables = new Map();
  const table = (n) => {
    if (!tables.has(n)) tables.set(n, new Map());
    return tables.get(n);
  };
  return {
    async get(n, k) {
      return structuredClone(table(n).get(k));
    },
    async put(n, k, v) {
      table(n).set(k, structuredClone(v));
      return structuredClone(v);
    },
    async update(n, k, fn) {
      const v = fn(structuredClone(table(n).get(k)));
      if (v !== undefined) table(n).set(k, structuredClone(v));
      return structuredClone(v);
    },
    async all(n) {
      return [...table(n)].map(([key, data]) => ({
        key,
        data: structuredClone(data),
      }));
    },
    async owned(n, owner) {
      const prefix = JSON.stringify([owner]).slice(0, -1) + ",";
      return (await this.all(n)).filter((r) => r.key.startsWith(prefix));
    },
  };
}
