/* Seed block set for the Compose Blocks editor — an "odd or even" exercise.
 * Order is meaningful: `main` calls is_odd(), so it must sit BELOW the def.
 * Swap this array for your own exercise's starting blocks. Each block:
 *   { id, label, code, collapsed } — collapsed defaults to false. */
window.COMPOSE_BLOCKS_SEED = [
  { id: "b1", label: "imports",    code: "import math",                                        collapsed: false },
  { id: "b2", label: "def is_odd", code: "def is_odd(n):\n    return n % 2 == 1",              collapsed: false },
  { id: "b3", label: "main",       code: 'n = 17\nprint("odd" if is_odd(n) else "even")',      collapsed: false },
];
