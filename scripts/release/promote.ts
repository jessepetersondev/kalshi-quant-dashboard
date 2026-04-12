import { readFile, writeFile } from "node:fs/promises";

interface ImageBlock {
  readonly name: string;
  readonly newTag: string | null;
}

interface PromoteArgs {
  readonly source: string;
  readonly target: string;
  readonly write: boolean;
}

function parseArgs(argv: readonly string[]): PromoteArgs {
  let source = "infra/kubernetes/overlays/staging/kustomization.yaml";
  let target = "infra/kubernetes/overlays/production/kustomization.yaml";
  let write = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source" && argv[index + 1]) {
      source = argv[index + 1]!;
      index += 1;
    } else if (token === "--target" && argv[index + 1]) {
      target = argv[index + 1]!;
      index += 1;
    } else if (token === "--write") {
      write = true;
    }
  }

  return { source, target, write };
}

function parseImageBlocks(text: string): ImageBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: ImageBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const nameMatch = lines[index]?.match(/^\s*-\s+name:\s+(.+)\s*$/);
    if (!nameMatch) {
      continue;
    }

    const name = nameMatch[1]!.trim();
    let newTag: string | null = null;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^\s*-\s+name:/.test(lines[cursor] ?? "")) {
        break;
      }

      const tagMatch = lines[cursor]?.match(/^\s*newTag:\s+(.+)\s*$/);
      if (tagMatch) {
        newTag = tagMatch[1]!.trim();
        break;
      }
    }

    blocks.push({ name, newTag });
  }

  return blocks;
}

function applyTags(text: string, desiredTags: Map<string, string>): string {
  const lines = text.split(/\r?\n/);
  let currentName: string | null = null;

  return lines
    .map((line) => {
      const nameMatch = line.match(/^\s*-\s+name:\s+(.+)\s*$/);
      if (nameMatch) {
        currentName = nameMatch[1]!.trim();
        return line;
      }

      const tagMatch = line.match(/^(\s*newTag:\s+)(.+)\s*$/);
      if (tagMatch && currentName && desiredTags.has(currentName)) {
        return `${tagMatch[1]}${desiredTags.get(currentName)}`;
      }

      return line;
    })
    .join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const [sourceText, targetText] = await Promise.all([
    readFile(args.source, "utf8"),
    readFile(args.target, "utf8")
  ]);

  const sourceImages = parseImageBlocks(sourceText);
  const targetImages = parseImageBlocks(targetText);
  const desiredTags = new Map(
    sourceImages.map((image) => [image.name, image.newTag ?? "latest"] as const)
  );

  for (const image of targetImages) {
    if (!desiredTags.has(image.name)) {
      throw new Error(`Target overlay image ${image.name} is missing from source overlay.`);
    }
  }

  const nextText = applyTags(targetText, desiredTags);
  if (args.write) {
    await writeFile(args.target, nextText, "utf8");
  } else if (nextText !== targetText) {
    console.log("Promotion check: production overlay tags differ from staging overlay tags.");
    console.log("Run with --write to update the production overlay.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
