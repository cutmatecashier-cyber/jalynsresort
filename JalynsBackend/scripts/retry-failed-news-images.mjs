/**
 * Retry failed posts with fuller HTML parsing (relative URLs, og:image, full page).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "uploads", "news");
const dataFile = path.join(root, "data", "news.json");
const LIVE = "https://jalynsresort.com";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; JalynsSync/1.0)" };
const SKIP =
  /avatar|emoji|logo|icon|favicon|gravatar|sprite|placeholder|make-a-booking|facebook|whatsapp|pinterest|twitter|share|badge|award|guru|kayak|blue.?alliance|divemindoro|wp-includes|smilies|cropped-jalyns/i;

const FAILED = [
  "scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site",
  "sabang-oktoberfest-2023",
  "discover-scuba-diving-in-beautiful-puerto-galera-at-jalyns-resort-dive-center",
  "travel-requirements-for-tourists-visiting-philippine-2023",
  "kayaks-now-available-to-rent",
  "fun-on-the-water-at-jalyns-resort",
  "spa-services-jalyns-resort",
];

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
  let s = 0;
  if (/\/uploads\//i.test(url)) s += 10;
  if (!/-\d+x\d+\.[^.]+$/i.test(url)) s += 5;
  if (/-scaled\.[^.]+$/i.test(url)) s += 3;
  return s;
}

function absUrl(u) {
  if (!u) return "";
  u = u.replace(/&amp;/g, "&").split("?")[0];
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${LIVE}${u}`;
  return u;
}

function extractUrls(html) {
  const found = [];
  const patterns = [
    /(?:src|data-src|data-lazy-src|data-full-url|content)=["']([^"']*\/wp-content\/uploads\/[^"']+)["']/gi,
    /(?:srcset)=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      if (re.source.includes("srcset")) {
        for (const part of m[1].split(",")) {
          const url = absUrl(part.trim().split(/\s+/)[0]);
          if (/\/wp-content\/uploads\//i.test(url)) found.push(url);
        }
      } else {
        found.push(absUrl(m[1]));
      }
    }
  }

  const byBase = new Map();
  for (const url of found) {
    if (!/^https?:\/\//i.test(url)) continue;
    if (!/\.(jpe?g|png|webp|gif)$/i.test(url)) continue;
    if (SKIP.test(url)) continue;
    const key = baseKey(url);
    const prev = byBase.get(key);
    if (!prev || scoreVariant(url) > scoreVariant(prev)) byBase.set(key, url);
  }
  return [...byBase.values()];
}

async function mirror(url, destName) {
  const dest = path.join(outDir, destName);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1500) {
    return `/uploads/news/${destName}`;
  }
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf)
    .rotate()
    .resize({ width: 1400, height: 1100, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(dest);
  return `/uploads/news/${destName}`;
}

const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));

for (const id of FAILED) {
  const post = store.posts.find((p) => p.id === id);
  if (!post) continue;
  const liveUrl = `${LIVE}/${id}/`;
  console.log(`\n→ ${id}`);
  try {
    const res = await fetch(liveUrl, { headers: UA, redirect: "follow" });
    console.log(`  status ${res.status}`);
    const html = await res.text();
    if (/just a moment|cf-browser-verification|challenge-platform/i.test(html)) {
      console.log("  blocked by Cloudflare challenge");
      continue;
    }
    const remote = extractUrls(html);
    console.log(`  found ${remote.length} uploads`);
    remote.slice(0, 5).forEach((u) => console.log("   ", u.slice(0, 100)));

    const locals = [];
    for (let i = 0; i < remote.length; i++) {
      const url = remote[i];
      const stem = slugify(baseKey(url)) || `photo-${i + 1}`;
      const name = `${id.slice(0, 28)}-${String(i + 1).padStart(2, "0")}-${stem}.jpg`;
      process.stdout.write(`  [${i + 1}/${remote.length}] ${stem}… `);
      try {
        const local = await mirror(url, name);
        console.log("ok");
        locals.push(local);
      } catch (e) {
        console.log("FAIL", e.message);
      }
    }
    if (locals.length) {
      post.image = locals[0];
      post.gallery = locals;
      if (Array.isArray(post.packages)) {
        for (let i = 0; i < post.packages.length; i++) {
          post.packages[i].image = locals[Math.min(i + 1, locals.length - 1)] || locals[0];
        }
      }
      console.log(`  ✓ ${locals.length} photos`);
    }
  } catch (e) {
    console.log("  ✗", e.message);
  }
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log("\nDone.");
