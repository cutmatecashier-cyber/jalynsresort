import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "news.json");
const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));

const id = "studio-apartments-available-for-long-term-rental-at-jalyns-resort";
const post = store.posts.find((p) => p.id === id);
if (!post) throw new Error("post not found");

// Exact structure from https://jalynsresort.com/studio-apartments-available-for-long-term-rental-at-jalyns-resort/
post.price = "P18k/month including Electricity + 1 month deposit";
post.body = `Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and breathtaking views at Jalyn’s Resort!

Notably, Jalyn’s Resort is equipped with Solar Power and Battery backups, ensuring uninterrupted access to essential services during power outages. Say goodbye to midnight surprises of your air-conditioning shutting off!

**P18k/month including Electricity + 1 month deposit.**

See below for details.

## Studio Apartments

**P18k/month including Electricity + 1 month deposit.**

- Solar/Battery Powered – no brownouts!
- Use of swimming pools
- King size bed
- Airconditioned + ceiling fan
- Hot Shower
- Kitchenette with Refrigerator
- Wifi
- Cable TV
- Terrace
- Basic cooking facilities for the terrace can be arranged
- Hotel Laundry Service available
- Room service food from our restaurant available

## Contact us for Inquiries

If you are interested in renting one of these apartment, or have any questions, please send us a message or contact us through our [Facebook Page](https://www.facebook.com/jalynsresortpuertogalera).`;

post.packages = [
  {
    title: "Studio Apartments",
    price: "P18k/month including Electricity + 1 month deposit",
    image: "/uploads/news/detail-apartment.jpg",
    amenities: [
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
    ],
  },
];

post.gallery = [
  "/uploads/news/pools-and-solar-1.jpg",
  "/uploads/news/detail-apartment.jpg",
  "/uploads/news/detail-main-building.jpg",
  "/uploads/news/detail-pool.jpg",
  "/uploads/news/detail-pools-solar.jpg",
  "/uploads/news/apartment-to-rent-puerto-galera.jpg",
];

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log("Studio apartments post matched to live WP article.");
