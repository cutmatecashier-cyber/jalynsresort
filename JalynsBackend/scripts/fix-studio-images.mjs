import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "uploads", "news");
const dataFile = path.join(root, "data", "news.json");
fs.mkdirSync(outDir, { recursive: true });

const pageUrl =
  "https://jalynsresort.com/studio-apartments-available-for-long-term-rental-at-jalyns-resort/";

const html = await (
  await fetch(pageUrl, {
    headers: { "User-Agent": "JalynsResortMirror/1.0" },
  })
).text();

const all = [
  ...html.matchAll(/https?:\/\/jalynsresort\.com\/wp-content\/uploads\/[^"'\\\s>]+/gi),
].map((m) => m[0].replace(/\\\//g, "/").split("?")[0]);

// Prefer full-size originals (drop -NNNxNNN thumbnails when possible)
const cleaned = [...new Set(all)].filter(
  (u) =>
    !/avatar|emoji|logo|icon|svg|favicon/i.test(u) &&
    /\.(jpe?g|png|webp|gif)$/i.test(u),
);

function baseKey(url) {
  const name = decodeURIComponent(url.split("/").pop() || "");
  return name.replace(/-\d+x\d+(?=\.[^.]+$)/, "").toLowerCase();
}

const byBase = new Map();
for (const url of cleaned) {
  const key = baseKey(url);
  const sized = /-\d+x\d+\.[^.]+$/i.test(url);
  const prev = byBase.get(key);
  if (!prev) {
    byBase.set(key, url);
    continue;
  }
  // Prefer unsized original over thumbnail
  const prevSized = /-\d+x\d+\.[^.]+$/i.test(prev);
  if (prevSized && !sized) byBase.set(key, url);
}

const unique = [...byBase.values()];
console.log("Found images on live page:");
unique.forEach((u) => console.log(" ", u));

async function mirror(url, name) {
  const dest = path.join(outDir, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 2000) {
    console.log("skip", name);
    return `/uploads/news/${name}`;
  }
  process.stdout.write(`fetch ${name}… `);
  const res = await fetch(url, { headers: { "User-Agent": "JalynsResortMirror/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf)
    .rotate()
    .resize({ width: 1200, height: 900, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(dest);
  console.log(`${Math.round(fs.statSync(dest).size / 1024)}KB`);
  return `/uploads/news/${name}`;
}

const locals = [];
for (let i = 0; i < unique.length; i++) {
  const url = unique[i];
  const stem = baseKey(url)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const name = `studio-${String(i + 1).padStart(2, "0")}-${stem || "photo"}.jpg`;
  locals.push(await mirror(url, name));
}

if (locals.length === 0) throw new Error("No images found on live page");

const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const post = store.posts.find(
  (p) => p.id === "studio-apartments-available-for-long-term-rental-at-jalyns-resort",
);
if (!post) throw new Error("post not found");

post.image = locals[0];
post.gallery = locals;
if (post.packages?.[0]) {
  post.packages[0].image = locals[1] || locals[0];
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log("Updated studio post:");
console.log(" image:", post.image);
console.log(" gallery:", post.gallery.length, "photos");
