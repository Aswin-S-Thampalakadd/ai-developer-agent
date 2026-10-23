import fs from "node:fs/promises";
import path from "node:path";

let workspaceRoot = null;

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".vite",
]);

const IGNORED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
]);

const MAX_FILES = 1000;
const MAX_DEPTH = 12;
const MAX_FILE_SIZE = 1024 * 1024;

function isSensitiveFile(name) {
  return (
    IGNORED_FILES.has(name) ||
    name.startsWith(".env.") ||
    /\.(pem|key|p12|pfx)$/i.test(name) ||
    /credential|secret/i.test(name)
  );
}

function isInsideWorkspace(targetPath) {
  const relativePath = path.relative(workspaceRoot, targetPath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

export async function setWorkspace(directoryPath) {
  if (typeof directoryPath !== "string" || !directoryPath.trim()) {
    throw new Error("Please provide a project directory path.");
  }

  const absolutePath = path.resolve(directoryPath.trim());
  const stats = await fs.stat(absolutePath);

  if (!stats.isDirectory()) {
    throw new Error("The selected path is not a directory.");
  }

  workspaceRoot = await fs.realpath(absolutePath);

  return {
    path: workspaceRoot,
    name: path.basename(workspaceRoot),
  };
}

export function getWorkspace() {
  if (!workspaceRoot) {
    return null;
  }

  return {
    path: workspaceRoot,
    name: path.basename(workspaceRoot),
  };
}

export async function listFiles() {
  if (!workspaceRoot) {
    throw new Error("Open a project before listing files.");
  }

  const files = [];

  async function walk(directory, depth = 0) {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) {
      return;
    }

    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        break;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        await walk(path.join(directory, entry.name), depth + 1);
        continue;
      }

      if (!entry.isFile() || isSensitiveFile(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);

      if (!isInsideWorkspace(absolutePath)) {
        continue;
      }

      files.push({
        path: path
          .relative(workspaceRoot, absolutePath)
          .split(path.sep)
          .join("/"),
        name: entry.name,
      });
    }
  }

  await walk(workspaceRoot);

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function readWorkspaceFile(relativePath) {
  if (!workspaceRoot) {
    throw new Error("Open a project before reading files.");
  }

  if (
    typeof relativePath !== "string" ||
    !relativePath.trim() ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Invalid file path.");
  }

  const normalizedPath = relativePath.replaceAll("\\", "/");
  const segments = normalizedPath.split("/");

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        IGNORED_DIRECTORIES.has(segment) ||
        isSensitiveFile(segment)
    )
  ) {
    throw new Error("Access to this path is not allowed.");
  }

  const absolutePath = path.resolve(workspaceRoot, normalizedPath);

  if (!isInsideWorkspace(absolutePath)) {
    throw new Error("The file is outside the selected project.");
  }

  let currentPath = workspaceRoot;

  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    const stats = await fs.lstat(currentPath);

    if (stats.isSymbolicLink()) {
      throw new Error("Symbolic links cannot be opened.");
    }
  }

  const stats = await fs.stat(absolutePath);

  if (!stats.isFile()) {
    throw new Error("The selected path is not a file.");
  }

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error("This file is larger than the 1 MB reading limit.");
  }

  const content = await fs.readFile(absolutePath, "utf8");

  if (content.includes("\0")) {
    throw new Error("Binary files cannot be opened in the code viewer.");
  }

  return {
    path: normalizedPath,
    content,
  };
}
