/**
 * Migrate local /uploads/news/* images into Supabase Storage and rewrite news.json.
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in JalynsBackend/.env
 * Also run supabase/NEWS_PAGE.sql in the Supabase SQL Editor first.
 *
 * Usage: node scripts/migrate-news-images-to-supabase.mjs
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "news.json");
const newsDir = path.join(root, "uploads", "news");
const BUCKET = "news-page";
const FOLDER = "posts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 12582912,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"],
  });
  if (error && !/already exists|duplicate|exists/i.test(error.message)) {
    throw new Error(error.message);
  }
}

function publicUrl(objectPath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return `${data.publicUrl}?v=${Date.now()}`;
}

const cache = new Map();

async function migrateLocalPath(localUrl) {
  if (!localUrl || typeof localUrl !== "string") return localUrl;
  if (/^https?:\/\//i.test(localUrl)) return localUrl;
  if (!localUrl.startsWith("/uploads/news/")) return localUrl;
  if (cache.has(localUrl)) return cache.get(localUrl);

  const filePath = path.join(root, localUrl.replace(/^\//, ""));
  if (!fs.existsSync(filePath)) {
    console.warn("MISSING", localUrl);
    cache.set(localUrl, localUrl);
    return localUrl;
  }

  const buf = fs.readFileSync(filePath);
  const jpeg = await sharp(buf)
    .rotate()
    .resize({ width: 1400, height: 1100, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  const stem =
    path
      .basename(filePath)
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .slice(0, 70) || "photo";
  const objectPath = `${FOLDER}/${stem}-${randomUUID().slice(0, 6)}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, jpeg, {
    cacheControl: "3600",
    upsert: false,
    contentType: "image/jpeg",
  });
  if (error) throw new Error(`${localUrl}: ${error.message}`);

  const remote = publicUrl(objectPath);
  cache.set(localUrl, remote);
  console.log("OK", localUrl, "→", remote.slice(0, 80) + "…");
  return remote;
}

await ensureBucket();
const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));

for (const post of store.posts) {
  post.image = await migrateLocalPath(post.image);
  if (Array.isArray(post.gallery)) {
    post.gallery = await Promise.all(post.gallery.map((u) => migrateLocalPath(u)));
  }
  if (Array.isArray(post.packages)) {
    for (const pkg of post.packages) {
      if (pkg.image) pkg.image = await migrateLocalPath(pkg.image);
    }
  }
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log(`\nMigrated ${cache.size} unique images. Wrote ${dataFile}`);
console.log("Restart backend / hard-refresh the site.");
