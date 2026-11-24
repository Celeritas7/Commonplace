// An ownership boundary for future adapters, NOT a server authorization mechanism.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECTION = /^[a-z][a-z0-9.-]{0,79}$/;
const KINDS = new Set(['progress', 'bookmark', 'highlight', 'note']);
function record(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).sort().join() !== 'id,kind,section,value' ||
      !SECTION.test(input.section) || typeof input.id !== 'string' ||
      input.id.length < 1 || input.id.length > 160 || !KINDS.has(input.kind) ||
      !input.value || typeof input.value !== 'object' || Array.isArray(input.value)) throw Error('Invalid study record');
  // Opaque study payload is never interpreted as executable HTML/code or authority.
  const serialized = JSON.stringify(input.value);
  if (new TextEncoder().encode(serialized).length > 65536) throw Error('Record too large');
  return {section: input.section, id: input.id, kind: input.kind, value: JSON.parse(serialized)};
}
export function createAccountStore(storage, project) {
  if (!/^[a-z0-9-]{1,80}$/.test(project)) throw Error('Invalid project namespace');
  let owner = null, generation = 0, controller = new AbortController();
  const prefix = user => `cp:u1:${project}:${user}:`;
  const key = (user, r) => prefix(user) + JSON.stringify([r.section, r.kind, r.id]);
  function check(ticket) {
    if (!owner || ticket.owner !== owner || ticket.generation !== generation || ticket.signal !== controller.signal || ticket.signal.aborted) throw Error('Account changed');
  }
  return {
    // Call on ownership invalidation/signout, not same-owner token refreshes.
    // Caller verifies identity online; session events do not grant access.
    // An offline reopen requires a separate explicit owner/lease flow in U8.
    switchAccount(user) {
      if (user !== null && !UUID.test(user)) throw Error('Verified UUID required');
      controller.abort(); controller = new AbortController(); generation++;
      owner = user === null ? null : user.toLowerCase();
    },
    ticket() { if (!owner) throw Error('No account'); return Object.freeze({owner, generation, signal: controller.signal}); },
    put(ticket, input) { check(ticket); const r = record(input); storage.setItem(key(owner,r), JSON.stringify(r)); },
    list(ticket) {
      check(ticket); const result = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k?.startsWith(prefix(owner))) continue;
        const r = record(JSON.parse(storage.getItem(k)));
        if (key(owner,r) !== k) throw Error('Corrupt owned record');
        result.push(r);
      }
      return result;
    },
    exportBackup(ticket) {
      check(ticket);
      // Never enumerate legacy/global storage into a backup (tokens, roles, etc.).
      return JSON.stringify({format: 'commonplace-study', version: 1, project, owner, records: this.list(ticket)});
    },
    importBackup(ticket, text) {
      check(ticket);
      if (typeof text !== 'string' || text.length > 8 * 1024 * 1024) throw Error('Backup too large');
      const b = JSON.parse(text);
      if (!b || Object.keys(b).sort().join() !== 'format,owner,project,records,version' ||
          b.format !== 'commonplace-study' || b.version !== 1 || b.owner !== owner || b.project !== project ||
          !Array.isArray(b.records) || b.records.length > 10000) throw Error('Backup identity/format mismatch');
      const incoming = b.records.map(record); // Validate everything before any write.
      const seen = new Set();
      for (const r of incoming) { const k=key(owner,r); if (seen.has(k)) throw Error('Duplicate record'); seen.add(k); }
      // Fill missing only: never overwrite existing or unreadable work. On quota
      // failure earlier inserts remain valid; retry is idempotent, no deletes.
      let added = 0, retained = 0;
      for (const r of incoming) {
        check(ticket); const k = key(owner,r);
        if (storage.getItem(k) !== null) { retained++; continue; }
        storage.setItem(k,JSON.stringify(r)); added++;
      }
      return {added, retained};
    }
  };
}
