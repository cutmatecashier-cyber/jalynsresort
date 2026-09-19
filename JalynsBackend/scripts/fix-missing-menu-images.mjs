/**
 * Clear restaurant dish image_url values when the local file is missing.
 * Usage: node scripts/fix-missing-menu-images.mjs
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const menuDir = path.join(root, "uploads", "menu");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: items, error } = await supabase
  .from("restaurant_menu_items")
  .select("id, name, image_url")
  .not("image_url", "is", null);

if (error) {
  console.error(error.message);
  process.exit(1);
}

let cleared = 0;
for (const item of items || []) {
  const imageUrl = String(item.image_url || "").trim();
  if (!imageUrl.startsWith("/uploads/menu/")) continue;
  const file = path.join(root, imageUrl.replace(/^\//, ""));
  if (fs.existsSync(file) && fs.statSync(file).size > 500) {
    console.log("OK ", item.name, imageUrl);
    continue;
  }
  const { error: updErr } = await supabase
    .from("restaurant_menu_items")
    .update({ image_url: null })
    .eq("id", item.id);
  if (updErr) {
    console.log("FAIL", item.name, updErr.message);
    continue;
  }
  cleared++;
  console.log("CLEARED", item.name, imageUrl);
}

console.log(`\nCleared ${cleared} missing dish image(s). Re-upload photos in Restaurant admin.`);
