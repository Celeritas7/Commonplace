/* ============================================================
   Weekly Focus (offline build) — config
   ------------------------------------------------------------
   offline: true turns off Supabase, sign-in, Akatsuki and the
   Command Centre bridge. Everything is saved in this browser's
   localStorage. Use the "On this device" pill to back up/restore.
   board is the board that opens the first time.
   ============================================================ */
window.WF_CONFIG = {
  offline: true,
  board: "my_week"
};
