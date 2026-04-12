import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export async function loadFixture<T>(relativePath: string): Promise<T> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidateRoots = [
    join(currentDir, "..", "..", "db", "src", "seed", "fixtures"),
    join(currentDir, "..", "..", "..", "db", "src", "seed", "fixtures"),
    join(currentDir, "..", "..", "..", "..", "db", "src", "seed", "fixtures")
  ];

  for (const root of candidateRoots) {
    try {
      const raw = await readFile(join(root, relativePath), "utf8");
      return JSON.parse(raw) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to locate fixture ${relativePath} from ${currentDir}. Checked: ${candidateRoots.join(", ")}`
  );
}

export function freezeNow(dateIso: string): () => void {
  const originalNow = Date.now;
  const fixed = new Date(dateIso).valueOf();
  Date.now = () => fixed;
  return () => {
    Date.now = originalNow;
  };
}

export * from "./database.js";
