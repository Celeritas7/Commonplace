import path from "node:path";

// Includes the directory itself. Callers use realpath first when checking an
// output location, so a symlink/junction cannot hide an in-repository target.
// Package/URL names use '/', but filesystem boundaries use the host's path API.
export function isWithinDirectory(root, candidate, paths = path) {
  if (!paths.isAbsolute(root) || !paths.isAbsolute(candidate)) return false;
  const relative = paths.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + paths.sep) &&
      !paths.isAbsolute(relative))
  );
}
