/**
 * Download remote news images, resize to ~900px JPEG, save under uploads/news,
 * and rewrite news.json (+ print a URL map).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataFile = path.join(root, "data", "news.json");
const outDir = path.join(root, "uploads", "news");

fs.mkdirSync(outDir, { recursive: true });

function slugFromUrl(url) {
  const base = path.basename(new URL(url).pathname);
  return base
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const posts = Array.isArray(store.posts) ? store.posts : store;
const map = new Map();

for (const post of posts) {
  const src = typeof post.image === "string" ? post.image.trim() : "";
  if (!src || !/^https?:\/\//i.test(src)) continue;
  if (map.has(src)) {
    post.image = map.get(src);
    continue;
  }

  const name = `${slugFromUrl(src) || post.id}.jpg`;
  const dest = path.join(outDir, name);
  const localUrl = `/uploads/news/${name}`;

  if (!fs.existsSync(dest) || fs.statSync(dest).size < 1000) {
    process.stdout.write(`Fetching ${src.slice(0, 70)}… `);
    const res = await fetch(src, {
      headers: { "User-Agent": "JalynsResortMirror/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
      .rotate()
      .resize({ width: 900, height: 700, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(dest);
    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log(`${kb}KB`);
  } else {
    console.log(`Skip existing ${name}`);
  }

  map.set(src, localUrl);
  post.image = localUrl;
}

fs.writeFileSync(dataFile, JSON.stringify({ posts }, null, 2) + "\n");
console.log(`Updated ${dataFile} (${map.size} images)`);
