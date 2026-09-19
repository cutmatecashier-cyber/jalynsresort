/**
 * Senior approach: scrape EVERY live WP news article for its real photos,
 * download/optimize locally, and rewrite news.json galleries.
 *
 * Usage: node scripts/scrape-all-news-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "uploads", "news");
const dataFile = path.join(root, "data", "news.json");
fs.mkdirSync(outDir, { recursive: true });

const LIVE = "https://jalynsresort.com";
const UA = { "User-Agent": "JalynsResortContentSync/1.0 (+local-dev)" };

const SKIP =
  /avatar|emoji|logo|icon|favicon|gravatar|sprite|placeholder|make-a-booking|booking\.jpg|facebook|whatsapp|pinterest|twitter|share|badge|award|guru|kayak.?travel|blue.?alliance|divemindoro|wp-includes|smilies/i;

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function baseKey(url) {
  const name = decodeURIComponent(url.split("/").pop() || "");
  return name
    .replace(/-scaled(?=\.[^.]+$)/i, "")
    .replace(/-\d+x\d+(?=\.[^.]+$)/i, "")
    .toLowerCase();
}

function scoreVariant(url) {
  // Higher = better to keep as the canonical file for that base image
  let s = 0;
  if (/\/uploads\//i.test(url)) s += 10;
  if (!/-\d+x\d+\.[^.]+$/i.test(url)) s += 5; // full size
  if (/-scaled\.[^.]+$/i.test(url)) s += 3; // WP scaled full
  if (/-1024x/i.test(url)) s += 1;
  return s;
}

function articleScope(html) {
  const m =
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return m?.[1] || html;
}

function collectUploadUrls(chunk) {
  const found = [];
  for (const m of chunk.matchAll(
    /(?:src|data-src|data-lazy-src|data-full-url|content)=["'](https?:\/\/[^"']+?\/wp-content\/uploads\/[^"']+)["']/gi,
  )) {
    found.push(m[1].split("?")[0].replace(/&amp;/g, "&"));
  }
  for (const m of chunk.matchAll(
    /(?:src|data-src|data-lazy-src|data-full-url)=["'](\/wp-content\/uploads\/[^"']+)["']/gi,
  )) {
    found.push(`${LIVE}${m[1].split("?")[0].replace(/&amp;/g, "&")}`);
  }
  for (const m of chunk.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      let url = part.trim().split(/\s+/)[0];
      if (!url) continue;
      if (url.startsWith("/wp-content/uploads/")) url = LIVE + url;
      if (/\/wp-content\/uploads\//i.test(url)) {
        found.push(url.split("?")[0].replace(/&amp;/g, "&"));
      }
    }
  }
  return found;
}

function extractUploadUrls(html) {
  // Prefer <article> so related-post sidebars don't pollute galleries.
  // Always merge og:image (featured) which often sits in <head>.
  const found = collectUploadUrls(articleScope(html));
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og?.[1] && /\/wp-content\/uploads\//i.test(og[1])) {
    found.unshift(og[1].split("?")[0].replace(/&amp;/g, "&"));
  }

  const byBase = new Map();
  for (const url of found) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(url)) continue;
    if (SKIP.test(url)) continue;
    const key = baseKey(url);
    const prev = byBase.get(key);
    if (!prev || scoreVariant(url) > scoreVariant(prev)) {
      byBase.set(key, url);
    }
  }
  return [...byBase.values()];
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function mirror(url, destName) {
  const dest = path.join(outDir, destName);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1500) {
    return `/uploads/news/${destName}`;
  }
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} download ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf)
    .rotate()
    .resize({ width: 1400, height: 1100, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(dest);
  return `/uploads/news/${destName}`;
}

const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const report = [];

for (const post of store.posts) {
  const liveUrl = `${LIVE}/${post.id}/`;
  process.stdout.write(`\n→ ${post.id}\n`);
  try {
    const html = await fetchHtml(liveUrl);
    const remote = extractUploadUrls(html);
    if (remote.length === 0) {
      console.log("  (no article images found — keeping existing gallery)");
      report.push({ id: post.id, ok: false, count: 0 });
      continue;
    }

    const locals = [];
    for (let i = 0; i < remote.length; i++) {
      const url = remote[i];
      const stem = slugify(baseKey(url)) || `photo-${i + 1}`;
      const name = `${post.id.slice(0, 28)}-${String(i + 1).padStart(2, "0")}-${stem}.jpg`;
      process.stdout.write(`  [${i + 1}/${remote.length}] ${stem}… `);
      try {
        const local = await mirror(url, name);
        const kb = Math.round(fs.statSync(path.join(outDir, name)).size / 1024);
        console.log(`${kb}KB`);
        locals.push(local);
      } catch (err) {
        console.log(`FAIL ${err instanceof Error ? err.message : err}`);
      }
    }

    if (locals.length === 0) {
      report.push({ id: post.id, ok: false, count: 0 });
      continue;
    }

    post.image = locals[0];
    post.gallery = locals;
    if (Array.isArray(post.packages)) {
      for (let i = 0; i < post.packages.length; i++) {
        post.packages[i].image = locals[Math.min(i + 1, locals.length - 1)] || locals[0];
      }
    }

    console.log(`  ✓ ${locals.length} photos`);
    report.push({ id: post.id, ok: true, count: locals.length });
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : err}`);
    report.push({ id: post.id, ok: false, count: 0, error: String(err) });
  }
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");

const ok = report.filter((r) => r.ok);
const fail = report.filter((r) => !r.ok);
console.log("\n========== SUMMARY ==========");
console.log(`Updated: ${ok.length}/${report.length} posts`);
console.log(`Photos total: ${ok.reduce((a, r) => a + r.count, 0)}`);
if (fail.length) {
  console.log("Needs review:");
  fail.forEach((r) => console.log(`  - ${r.id}${r.error ? ` (${r.error})` : ""}`));
}
console.log("Wrote", dataFile);
