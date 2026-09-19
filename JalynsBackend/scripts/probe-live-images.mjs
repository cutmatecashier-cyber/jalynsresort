/**
 * Probe live WP articles: how many unique upload images each post has.
 * Usage: node scripts/probe-live-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = JSON.parse(fs.readFileSync(path.join(root, "data", "news.json"), "utf8"));
const LIVE = "https://jalynsresort.com";
const UA = { "User-Agent": "JalynsResortContentSync/1.0 (+local-dev)" };
const SKIP =
  /avatar|emoji|logo|icon|favicon|gravatar|sprite|placeholder|make-a-booking|booking\.jpg|facebook|whatsapp|pinterest|twitter|share|badge|award|guru|kayak.?travel|blue.?alliance|divemindoro|wp-includes|smilies/i;

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
  if (/-1024x/i.test(url)) s += 1;
  return s;
}

function extract(html) {
  const found = [];
  for (const m of html.matchAll(
    /(?:src|data-src|data-lazy-src|data-full-url|content)=["'](https?:\/\/[^"']+?\/wp-content\/uploads\/[^"']+)["']/gi,
  )) {
    found.push(m[1].split("?")[0].replace(/&amp;/g, "&"));
  }
  for (const m of html.matchAll(/(?:src|data-src|data-lazy-src)=["'](\/wp-content\/uploads\/[^"']+)["']/gi)) {
    found.push(`${LIVE}${m[1].split("?")[0]}`);
  }
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      let url = part.trim().split(/\s+/)[0];
      if (!url) continue;
      if (url.startsWith("/wp-content/uploads/")) url = LIVE + url;
      if (/\/wp-content\/uploads\//i.test(url)) found.push(url.split("?")[0]);
    }
  }
  const byBase = new Map();
  for (const url of found) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(url)) continue;
    if (SKIP.test(url)) continue;
    const key = baseKey(url);
    const prev = byBase.get(key);
    if (!prev || scoreVariant(url) > scoreVariant(prev)) byBase.set(key, url);
  }
  return [...byBase.entries()];
}

for (const post of store.posts) {
  const local = (post.gallery || []).length;
  try {
    const res = await fetch(`${LIVE}/${post.id}/`, { headers: UA, redirect: "follow" });
    if (!res.ok) {
      console.log(`FAIL ${res.status}  local=${local}  ${post.id}`);
      continue;
    }
    const entries = extract(await res.text());
    const mark = entries.length > local ? "↑ NEED" : entries.length < local ? "↓ EXTRA" : "  OK";
    console.log(`${mark} live=${String(entries.length).padStart(2)} local=${String(local).padStart(2)}  ${post.id}`);
  } catch (err) {
    console.log(`ERR  local=${local}  ${post.id}  ${err instanceof Error ? err.message : err}`);
  }
}
