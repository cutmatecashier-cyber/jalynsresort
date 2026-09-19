import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const j = JSON.parse(fs.readFileSync(path.join(root, "data", "news.json"), "utf8"));
const byStem = new Map();
for (const p of j.posts) {
  const file = p.image.split("/").pop();
  const stem = file.replace(/\.[^.]+$/, "");
  byStem.set(stem, p.image);
}

function localFor(url) {
  const raw = decodeURIComponent(url.split("/").pop());
  const key = raw
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  if (byStem.has(key)) return byStem.get(key);
  for (const [stem, local] of byStem) {
    if (stem.includes(key.slice(0, 28)) || key.includes(stem.slice(0, 28))) return local;
  }
  return null;
}

function patchFile(rel) {
  const file = path.join(root, rel);
  let text = fs.readFileSync(file, "utf8");
  let misses = 0;
  text = text.replace(
    /https:\/\/jalynsresort\.com\/wp-content\/uploads\/[^"']+/g,
    (url) => {
      const next = localFor(url);
      if (!next) {
        misses += 1;
        console.log("NO MATCH", rel, url);
        return url;
      }
      return next;
    },
  );
  fs.writeFileSync(file, text);
  console.log("patched", rel, "misses", misses);
}

patchFile("src/services/news.ts");
patchFile("../JalynsFrontend/src/lib/news.ts");
