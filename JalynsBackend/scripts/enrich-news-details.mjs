/**
 * Enrich news.json with structured detail (price, packages, gallery)
 * matching live WP articles like studio/single-double rentals.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "news.json");
const outDir = path.join(root, "uploads", "news");
fs.mkdirSync(outDir, { recursive: true });

async function mirror(url, name) {
  const dest = path.join(outDir, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 2000) {
    return `/uploads/news/${name}`;
  }
  process.stdout.write(`  mirror ${name}… `);
  const res = await fetch(url, { headers: { "User-Agent": "JalynsResortMirror/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf)
    .rotate()
    .resize({ width: 1100, height: 900, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 74, mozjpeg: true })
    .toFile(dest);
  console.log(`${Math.round(fs.statSync(dest).size / 1024)}KB`);
  return `/uploads/news/${name}`;
}

const roomAmenityStudio = [
  "Solar/Battery Powered – no brownouts!",
  "Use of swimming pools",
  "King size bed",
  "Airconditioned + ceiling fan",
  "Hot Shower",
  "Kitchenette with Refrigerator",
  "Wifi",
  "Cable TV",
  "Terrace",
  "Basic cooking facilities for the terrace can be arranged",
  "Hotel Laundry Service available",
  "Room service food from our restaurant available",
];

const roomAmenitySingle = [
  "Solar/Battery Powered – no brownouts!",
  "Use of swimming pools",
  "King size bed",
  "Airconditioned + ceiling fan",
  "Hot Shower",
  "Refrigerator",
  "Wifi",
  "Cable TV",
  "Terrace",
  "Basic cooking facilities for the terrace can be arranged",
  "Hotel Laundry Service available",
  "Room service food from our restaurant available",
];

const roomAmenityDouble = [
  "Solar/Battery Powered – no brownouts!",
  "Use of swimming pools",
  "King size bed and Queen size bed in second bedroom",
  "Airconditioned + ceiling fan",
  "Hot Shower",
  "Refrigerator",
  "Wifi",
  "Cable TV",
  "Terrace",
  "Basic cooking facilities for the terrace can be arranged",
  "Hotel Laundry Service available",
  "Room service food from our restaurant available",
];

// Extra room/gallery photos from live site / known assets
const EXTRA = {
  studio1: "https://jalynsresort.com/wp-content/uploads/2019/05/jalyns-resort-puerto-galera-main-building.jpg",
  studio2: "https://jalynsresort.com/wp-content/uploads/2023/09/pools-and-solar-1.jpg",
  room1: "https://jalynsresort.com/wp-content/uploads/2019/05/jalyns-resort-puerto-galera-main-building.jpg",
  apt: "https://jalynsresort.com/wp-content/uploads/2020/02/apartment-to-rent-puerto-galera.jpg",
  dive: "https://jalynsresort.com/wp-content/uploads/2023/09/Rooms-Diving-Special-Offer-jalyns-resort-puerto-galera.jpg",
  pool: "https://jalynsresort.com/wp-content/uploads/2023/09/pools-and-solar-1.jpg",
  spa: "https://jalynsresort.com/wp-content/uploads/2019/05/spa-service-jalyns-resort-blog.jpg",
  kayak: "https://jalynsresort.com/wp-content/uploads/2020/02/kayak-rental-puerto-galera-jalyns-resort.jpg",
  restaurant: "https://jalynsresort.com/wp-content/uploads/2020/01/jalyns-restaurant-puerto-galera-daily-special-menus.jpg",
  boat: "https://jalynsresort.com/wp-content/uploads/2020/02/jalyns-resort-puerto-galera-boat-trips.jpg",
};

console.log("Mirroring extra gallery images…");
const g = {
  studio1: await mirror(EXTRA.studio1, "detail-main-building.jpg"),
  studio2: await mirror(EXTRA.studio2, "detail-pools-solar.jpg"),
  apt: await mirror(EXTRA.apt, "detail-apartment.jpg"),
  dive: await mirror(EXTRA.dive, "detail-rooms-dive.jpg"),
  pool: await mirror(EXTRA.pool, "detail-pool.jpg"),
  spa: await mirror(EXTRA.spa, "detail-spa.jpg"),
  kayak: await mirror(EXTRA.kayak, "detail-kayak.jpg"),
  restaurant: await mirror(EXTRA.restaurant, "detail-restaurant.jpg"),
  boat: await mirror(EXTRA.boat, "detail-boat.jpg"),
};

/** @type {Record<string, object>} */
const enrich = {
  "studio-apartments-available-for-long-term-rental-at-jalyns-resort": {
    price: "₱18,000/month",
    body: `Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and breathtaking views at Jalyn’s Resort!

Notably, Jalyn’s Resort is equipped with Solar Power and Battery backups, ensuring uninterrupted access to essential services during power outages. Say goodbye to midnight surprises of your air-conditioning shutting off!

See below for details on Studio Apartments — pricing, photos, and what’s included.`,
    gallery: [g.studio2, g.studio1, g.apt, g.pool],
    packages: [
      {
        title: "Studio Apartments",
        price: "₱18,000/month including Electricity + 1 month deposit",
        image: g.apt,
        amenities: roomAmenityStudio,
      },
    ],
  },
  "single-double-rooms-available-for-long-term-rental-at-jalyns-resort": {
    price: "From ₱18,000/month",
    body: `Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and breathtaking views at Jalyn’s Resort!

Notably, Jalyn’s Resort is equipped with Solar Power and Battery backups, ensuring uninterrupted access to essential services during power outages. Say goodbye to midnight surprises of your air-conditioning shutting off!

Choose Single or Double Rooms below — each with photos, monthly rates, and included amenities.`,
    gallery: [g.studio2, g.studio1, g.apt, g.pool],
    packages: [
      {
        title: "Single Rooms",
        price: "₱18,000/month including Electricity + 1 month deposit",
        image: g.studio1,
        amenities: roomAmenitySingle,
      },
      {
        title: "Double Rooms",
        price: "₱25,000/month + 1 month deposit",
        image: g.apt,
        amenities: roomAmenityDouble,
      },
    ],
  },
  "apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera": {
    price: "Long-term rates available",
    body: `Jalyn’s Resort is pleased to announce that we now have One and Two-Bedroom apartments available for longer stays in Puerto Galera.

Enjoy solar/battery power, pools, wifi, and easy access to diving and dining — ideal for couples and families looking for an extended stay.`,
    gallery: [g.studio1, g.apt, g.pool, g.restaurant],
    packages: [
      {
        title: "One & Two-Bedroom Apartments",
        price: "Contact us for monthly rates",
        image: g.apt,
        amenities: [
          "Solar/Battery Powered – no brownouts!",
          "Use of swimming pools",
          "Airconditioned bedrooms",
          "Kitchen facilities",
          "Wifi & Cable TV",
          "Terrace / outdoor space",
          "Hotel laundry available",
          "Restaurant room service",
        ],
      },
    ],
  },
  "rooms-scuba-diving-special-offer": {
    price: "₱18,000 per person",
    body: `To mark the Sabang Oktoberfest celebration Jalyn’s Resort is offering 5 days/4 nights accommodation and 10 scuba dives for the low price of ₱18,000 per person!

This offer is available from September 15th – December 23rd 2023, and again from January 15th – March 24th 2024!

Expect great service, modern and comfortable rooms and all the wonderful amenities Jalyn’s Resort has to offer. And Jalyn’s Resort has an independent Solar Power and battery system, so you’ll never have to experience the inconvenience of brownouts when staying with us.`,
    gallery: [g.dive, g.pool, g.boat, g.studio1],
    packages: [
      {
        title: "5D/4N Rooms + 10 Scuba Dives",
        price: "₱18,000 per person",
        image: g.dive,
        amenities: [
          "5 days / 4 nights accommodation",
          "10 scuba dives",
          "Modern comfortable rooms",
          "Solar / battery power — no brownouts",
          "Resort amenities included",
        ],
      },
    ],
  },
  "jalyns-resort-is-offering-monthly-accommodation-rates-starting-from-april-2020": {
    price: "Monthly rates from April 2020",
    body: `1 bedroom apartment well suited for couple or family with 1 child. Free access to swimming pools and other resort amenities.

Ideal for longer stays in Puerto Galera with the comfort of home and resort facilities on site.`,
    gallery: [g.apt, g.studio1, g.pool],
    packages: [
      {
        title: "1-Bedroom Apartment",
        price: "Monthly rate — inquire for pricing",
        image: g.apt,
        amenities: [
          "Suited for couple or family with 1 child",
          "Free swimming pool access",
          "Resort amenities",
          "Wifi available",
        ],
      },
    ],
  },
  "may-promo-fun-dives-only-php999-at-jalyns-resort-dive-center": {
    price: "₱999 Fun Dives",
    body: `From May 5th until May 31st 2023 Jalyn’s Resort Dive Center is offering Fun Dives at a special promotional rate.

Perfect for certified divers who want to explore Puerto Galera’s reefs without a full course commitment.`,
    gallery: [g.boat, g.dive, g.pool],
    packages: [
      {
        title: "Fun Dive Promo",
        price: "₱999 per fun dive",
        image: g.boat,
        amenities: [
          "Valid May 5–31, 2023",
          "For certified divers",
          "Jalyn’s Resort Dive Center",
          "Puerto Galera dive sites",
        ],
      },
    ],
  },
  "kayaks-now-available-to-rent": {
    price: "Kayak rental available",
    body: `Jalyn’s Resort now has two double-seater kayaks and three single-seater kayaks available for rental. A great way to explore Mangrove Cove and the calm waters around the resort.`,
    gallery: [g.kayak, g.boat, g.pool],
    packages: [
      {
        title: "Kayak Rental",
        price: "Ask front desk for hourly / daily rates",
        image: g.kayak,
        amenities: [
          "2 double-seater kayaks",
          "3 single-seater kayaks",
          "Explore Mangrove Cove",
          "Life jackets available",
        ],
      },
    ],
  },
  "spa-services-jalyns-resort": {
    price: "Spa treatments available",
    body: `Relax with spa services at Jalyn’s Resort — massages and treatments designed to unwind after a day of diving or exploring Puerto Galera.`,
    gallery: [g.spa, g.pool, g.studio1],
    packages: [
      {
        title: "Spa Services",
        price: "See Spa page for full menu & rates",
        image: g.spa,
        amenities: [
          "Massage treatments",
          "Relax after diving",
          "Book at the resort",
        ],
      },
    ],
  },
};

const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
let n = 0;
for (const post of store.posts) {
  const extra = enrich[post.id];
  if (!extra) {
    // Still give every post a small gallery from its hero + pool for richer detail UI
    if (!Array.isArray(post.gallery) || post.gallery.length === 0) {
      post.gallery = [post.image, g.pool].filter(Boolean);
    }
    continue;
  }
  Object.assign(post, extra);
  n += 1;
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log(`Enriched ${n} featured posts + default galleries for others.`);
