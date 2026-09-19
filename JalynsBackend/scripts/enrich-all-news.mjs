/**
 * Give EVERY news post the same rich detail treatment:
 * multi-photo gallery + packages card + fuller body where thin.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "news.json");
const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));

const U = (name) => `/uploads/news/${name}`;

const POOL = [
  U("detail-pool.jpg"),
  U("detail-main-building.jpg"),
  U("detail-boat.jpg"),
  U("detail-rooms-dive.jpg"),
  U("detail-apartment.jpg"),
  U("detail-restaurant.jpg"),
  U("detail-spa.jpg"),
  U("detail-kayak.jpg"),
  U("hawksbill-turtle-puerto-galera.jpg"),
  U("pools-and-solar-1.jpg"),
  U("jalyns-resort-puerto-galera-boat-trips.jpg"),
];

/** Extra themed photos + body/packages per post id */
const SPECIFIC = {
  "studio-apartments-available-for-long-term-rental-at-jalyns-resort": {
    price: "₱18,000/month",
    gallery: [
      U("pools-and-solar-1.jpg"),
      U("detail-apartment.jpg"),
      U("detail-main-building.jpg"),
      U("detail-pool.jpg"),
      U("detail-pools-solar.jpg"),
      U("apartment-to-rent-puerto-galera.jpg"),
    ],
    body: `Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and breathtaking views at Jalyn’s Resort!

Notably, Jalyn’s Resort is equipped with Solar Power and Battery backups, ensuring uninterrupted access to essential services during power outages. Say goodbye to midnight surprises of your air-conditioning shutting off!

See below for details on Studio Apartments — pricing, photos, and what’s included.

## Studio Apartments

P18k/month including Electricity + 1 month deposit.

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

If you are interested in renting one of these apartments, or have any questions, please send us a message or contact us through our Facebook Page.`,
    packages: [
      {
        title: "Studio Apartments",
        price: "₱18,000/month including Electricity + 1 month deposit",
        image: U("detail-apartment.jpg"),
        amenities: [
          "Solar/Battery Powered – no brownouts!",
          "Use of swimming pools",
          "King size bed",
          "Airconditioned + ceiling fan",
          "Hot Shower",
          "Kitchenette with Refrigerator",
          "Wifi & Cable TV",
          "Terrace",
          "Hotel Laundry available",
          "Restaurant room service",
        ],
      },
    ],
  },
  "single-double-rooms-available-for-long-term-rental-at-jalyns-resort": {
    price: "From ₱18,000/month",
    gallery: [
      U("pools-and-solar-1.jpg"),
      U("detail-main-building.jpg"),
      U("detail-apartment.jpg"),
      U("detail-pool.jpg"),
      U("jalyns-resort-puerto-galera-main-building.jpg"),
      U("apartment-to-rent-puerto-galera.jpg"),
    ],
    body: `Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and breathtaking views at Jalyn’s Resort!

Notably, Jalyn’s Resort is equipped with Solar Power and Battery backups, ensuring uninterrupted access to essential services during power outages.

## Single Rooms

P18k/month including Electricity + 1 month deposit.

- Solar/Battery Powered – no brownouts!
- Use of swimming pools
- King size bed
- Airconditioned + ceiling fan
- Hot Shower
- Refrigerator
- Wifi & Cable TV
- Terrace

## Double Rooms

P25k/month + 1 month deposit.

- Solar/Battery Powered – no brownouts!
- Use of swimming pools
- King size bed and Queen size bed in second bedroom
- Airconditioned + ceiling fan
- Hot Shower
- Refrigerator
- Wifi & Cable TV
- Terrace

## Contact us for Inquiries

If you are interested in renting, please send us a message or contact us through our Facebook Page.`,
    packages: [
      {
        title: "Single Rooms",
        price: "₱18,000/month including Electricity + 1 month deposit",
        image: U("detail-main-building.jpg"),
        amenities: [
          "Solar/Battery Powered – no brownouts!",
          "Use of swimming pools",
          "King size bed",
          "Airconditioned + ceiling fan",
          "Hot Shower",
          "Refrigerator",
          "Wifi & Cable TV",
          "Terrace",
        ],
      },
      {
        title: "Double Rooms",
        price: "₱25,000/month + 1 month deposit",
        image: U("detail-apartment.jpg"),
        amenities: [
          "Solar/Battery Powered – no brownouts!",
          "Use of swimming pools",
          "King + Queen beds",
          "Airconditioned + ceiling fan",
          "Hot Shower",
          "Refrigerator",
          "Wifi & Cable TV",
          "Terrace",
        ],
      },
    ],
  },
  "phidex-2024-dive-expo": {
    gallery: [
      U("429317172-1651854885631461-47893951982924994-n.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
      U("detail-pool.jpg"),
    ],
    body: `The 2024 Philippines International Dive Expo was a great success, and we were proud to be involved, and see Puerto Galera so well represented by many dive operators and local officials.

We had the pleasure of meeting and talking with so many great people, and we hope the Expo will bring many more scuba diving enthusiasts to discover the incredible tropical reef diving in Puerto Galera.

## What’s next

To find out more about Scuba Diving and PADI Scuba Courses at Jalyn’s Resort Dive Center, visit our Scuba Diving page.

We hope to see you here!`,
    packages: [
      {
        title: "Dive with us in Puerto Galera",
        price: "Fun dives & PADI courses available",
        image: U("detail-rooms-dive.jpg"),
        amenities: [
          "Daily fun dives",
          "Night dives",
          "PADI courses",
          "Own bangka & speedboat",
          "Pool for confined water training",
        ],
      },
    ],
  },
  "sabang-oktoberfest-2023": {
    gallery: [
      U("sabang-oktoberfest-2023-puerto-galera.jpg"),
      U("detail-restaurant.jpg"),
      U("detail-pool.jpg"),
      U("detail-boat.jpg"),
      U("puerto-galera-independence-day-festival-1.jpg"),
      U("detail-main-building.jpg"),
    ],
    body: `If you are going to be in Puerto Galera this October, be sure to check out Sabang Oktoberfest — music, food, and celebration along the beach strip.

Jalyn’s Resort is the perfect base for enjoying the festival, with comfortable rooms, restaurant dining, and easy access to Sabang’s nightlife and dive sites.

## At the resort

- Comfortable rooms & apartments
- Restaurant & bar
- Swimming pools
- Scuba diving centre
- Solar / battery power

Contact us to book your stay during Oktoberfest!`,
    packages: [
      {
        title: "Stay for Sabang Oktoberfest",
        price: "Ask for festival-season rates",
        image: U("sabang-oktoberfest-2023-puerto-galera.jpg"),
        amenities: [
          "Close to Sabang beach strip",
          "Restaurant on site",
          "Pools & dive centre",
          "Solar / battery power",
        ],
      },
    ],
  },
  "puerto-galera-aldaw-kapiya-an-festival-2023": {
    gallery: [
      U("puerto-galera-independence-day-festival-1.jpg"),
      U("detail-main-building.jpg"),
      U("detail-pool.jpg"),
      U("detail-restaurant.jpg"),
      U("detail-boat.jpg"),
      U("sabang-oktoberfest-2023-puerto-galera.jpg"),
    ],
    body: `From June 5th – 12th 2023, Puerto Galera hosted the Aldaw Kapiya-An Festival — culture, community, and celebration across the municipality.

Jalyn’s Resort welcomes guests who want to experience local festivities while enjoying diving, dining, and a peaceful stay at Mangrove Cove.

## Experience Puerto Galera

- Cultural events & local celebrations
- Scuba diving & reef exploration
- Resort pools and restaurant
- Comfortable rooms for longer stays

Book with us and enjoy the best of Puerto Galera hospitality.`,
    packages: [
      {
        title: "Festival stay in Puerto Galera",
        price: "Contact us for dates & rates",
        image: U("puerto-galera-independence-day-festival-1.jpg"),
        amenities: [
          "Central location for festivities",
          "Dive centre on site",
          "Restaurant dining",
          "Pools & solar power",
        ],
      },
    ],
  },
  "vegan-vegetarian-dining-options-available-at-jalyns-resort-restaurant": {
    gallery: [
      U("vegan-vegetarian-dining-options-available-at-jalyns-resort-restaurant-puerto-gal.jpg"),
      U("detail-restaurant.jpg"),
      U("puerto-galera-classic-club-jalyns-resort-restaurant.jpg"),
      U("jalyns-restaurant-puerto-galera-daily-special-menus.jpg"),
      U("detail-pool.jpg"),
      U("detail-main-building.jpg"),
    ],
    body: `At Jalyn’s Resort we are always striving to provide our guests with the best possible dining experience — including vegan and vegetarian options at our restaurant.

Whether you’re diving all day or relaxing by the pool, our kitchen can prepare plant-based meals alongside our regular menu of Filipino and international favourites.

## Dining at Jalyn’s

- Vegan & vegetarian options
- Daily specials
- Fresh seafood when available
- Room service available for guests
- Relaxed resort restaurant setting

Ask our restaurant team about today’s plant-based specials!`,
    packages: [
      {
        title: "Vegan & Vegetarian Dining",
        price: "See daily specials at the restaurant",
        image: U("detail-restaurant.jpg"),
        amenities: [
          "Plant-based options available",
          "Daily special menus",
          "Room service for guests",
          "Dine by the cove",
        ],
      },
    ],
  },
  "no-more-brownouts-jalyns-resort-goes-solar": {
    gallery: [
      U("no-more-brownouts-jalyns-resort-goes-solar.jpg"),
      U("pools-and-solar-1.jpg"),
      U("detail-pools-solar.jpg"),
      U("detail-main-building.jpg"),
      U("detail-pool.jpg"),
      U("detail-apartment.jpg"),
    ],
    body: `Jalyn’s Resort is delighted to announce that we are no longer completely dependent on electricity from the grid! Our Solar Power setup covers all our electrical and hot water needs, with a battery system for overnight coverage.

For our valued guests this means vital amenities will work without interruption. No waking up in the middle of the night to discover the air-conditioning has switched off!

## Background on the power situation in Puerto Galera

Puerto Galera has faced frequent brownouts and problems with electricity supply since 2020, with a significant increase in brownouts during 2022. These power interruptions have not only affected the daily lives of residents, but have also disrupted the local tourism industry.

The root cause of the power interruptions is the inadequate generation capacity of the local power utility, which has struggled to keep up with the growing demand for electricity in the area.

## What solar means for guests

- Uninterrupted air-conditioning
- Reliable hot water
- Lights and wifi stay on overnight
- Quieter, greener resort operations

We hope you will be joining us to enjoy a spectacular tropical adventure in Puerto Galera.`,
    packages: [
      {
        title: "Solar-powered comfort",
        price: "No brownout interruptions",
        image: U("pools-and-solar-1.jpg"),
        amenities: [
          "Solar + battery backup",
          "AC stays on overnight",
          "Hot water covered",
          "More reliable guest amenities",
        ],
      },
    ],
  },
  "travel-requirements-for-tourists-visiting-philippine-2023": {
    gallery: [
      U("travel-requirements-for-tourists-visiting-puerto-galera-1.jpg"),
      U("detail-boat.jpg"),
      U("detail-main-building.jpg"),
      U("detail-pool.jpg"),
      U("detail-rooms-dive.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
    ],
    body: `After two years of strict travel restrictions during the Covid Pandemic, the Philippines is once again welcoming tourists. Requirements can change, so always check official government sources before you travel.

## Planning your trip to Puerto Galera

- Check current entry requirements for the Philippines
- Arrange transfer from Manila / Batangas to Puerto Galera
- Book rooms and dive packages in advance in peak season
- Contact Jalyn’s Resort for local advice and bookings

We’re happy to help you plan a smooth arrival and an unforgettable stay.`,
    packages: [
      {
        title: "Plan your Puerto Galera trip",
        price: "We’re here to help",
        image: U("travel-requirements-for-tourists-visiting-puerto-galera-1.jpg"),
        amenities: [
          "Local booking advice",
          "Rooms & dive packages",
          "Restaurant & spa on site",
          "Contact us anytime",
        ],
      },
    ],
  },
  "a-romantic-valentines-day-evening-at-jalyns-resort": {
    gallery: [
      U("valentines-day-puerto-galera-resort.jpg"),
      U("detail-restaurant.jpg"),
      U("detail-pool.jpg"),
      U("detail-spa.jpg"),
      U("detail-main-building.jpg"),
      U("detail-apartment.jpg"),
    ],
    body: `Join us at Jalyn’s Resort this Valentine’s Day for a romantic evening with your sweetheart.

Enjoy special dining, a beautiful cove setting, and the relaxed atmosphere of Mangrove Cove — perfect for couples celebrating together.

## A romantic evening

- Special Valentine’s dining
- Resort ambience by the water
- Comfortable rooms for overnight stays
- Spa treatments available

Contact us to reserve your table or room.`,
    packages: [
      {
        title: "Valentine’s evening at Jalyn’s",
        price: "Reserve dining or stay",
        image: U("valentines-day-puerto-galera-resort.jpg"),
        amenities: [
          "Romantic dining setting",
          "Overnight rooms available",
          "Spa options",
          "Cove views",
        ],
      },
    ],
  },
  "fun-on-the-water-at-jalyns-resort": {
    gallery: [
      U("jalyns-resort-puerto-galera-boat-trips.jpg"),
      U("detail-boat.jpg"),
      U("detail-kayak.jpg"),
      U("detail-pool.jpg"),
      U("kayak-rental-puerto-galera-jalyns-resort.jpg"),
      U("detail-rooms-dive.jpg"),
    ],
    body: `There’s plenty of fun on the water at Jalyn’s Resort — from boat trips and diving to kayaking around Mangrove Cove.

Whether you’re an experienced diver or a first-time visitor, our team can help you get out on the water safely and enjoy Puerto Galera’s coastline.

## Water activities

- Scuba diving & fun dives
- Boat trips
- Kayak rental
- Swimming pools on site

Ask the front desk what’s available during your stay.`,
    packages: [
      {
        title: "Water activities",
        price: "Ask front desk for rates",
        image: U("detail-boat.jpg"),
        amenities: [
          "Boat trips",
          "Scuba diving",
          "Kayak rental",
          "Resort pools",
        ],
      },
    ],
  },
  "jalyns-restaurant-puerto-galera-daily-special-menus": {
    gallery: [
      U("jalyns-restaurant-puerto-galera-daily-special-menus.jpg"),
      U("detail-restaurant.jpg"),
      U("puerto-galera-classic-club-jalyns-resort-restaurant.jpg"),
      U("vegan-vegetarian-dining-options-available-at-jalyns-resort-restaurant-puerto-gal.jpg"),
      U("detail-pool.jpg"),
      U("detail-main-building.jpg"),
    ],
    body: `Jalyn’s Restaurant serves daily special menus alongside our regular selection of Filipino and international dishes.

Fresh ingredients, friendly service, and a relaxed setting by the cove make every meal part of your Puerto Galera holiday.

## At the restaurant

- Daily specials
- Local & international dishes
- Vegetarian options
- Room service for resort guests

Ask about today’s specials when you dine with us.`,
    packages: [
      {
        title: "Daily special menus",
        price: "See today’s board",
        image: U("detail-restaurant.jpg"),
        amenities: [
          "Changing daily specials",
          "Filipino & international",
          "Vegetarian options",
          "Room service available",
        ],
      },
    ],
  },
  "classic-club-lunch-at-jalyns-resort": {
    gallery: [
      U("puerto-galera-classic-club-jalyns-resort-restaurant.jpg"),
      U("detail-restaurant.jpg"),
      U("jalyns-restaurant-puerto-galera-daily-special-menus.jpg"),
      U("detail-pool.jpg"),
      U("detail-main-building.jpg"),
      U("valentines-day-puerto-galera-resort.jpg"),
    ],
    body: `Enjoy a classic club lunch at Jalyn’s Resort Restaurant — a satisfying midday meal after diving or exploring Puerto Galera.

Pair it with a cold drink by the water and make lunch part of your resort day.

## Lunch at Jalyn’s

- Classic club sandwich and more
- Fresh sides
- Resort restaurant setting
- Ideal after a morning dive

Ask our restaurant team for today’s lunch favourites.`,
    packages: [
      {
        title: "Classic Club Lunch",
        price: "See restaurant menu",
        image: U("puerto-galera-classic-club-jalyns-resort-restaurant.jpg"),
        amenities: [
          "Hearty midday meal",
          "Restaurant by the cove",
          "Great after diving",
          "Daily specials too",
        ],
      },
    ],
  },
  "padi-advanced-open-water-students-review": {
    gallery: [
      U("padi-advanced-open-water-students-puerto-galera.jpg"),
      U("padi-advanced-open-water-scuba-course-puerto-galera.jpg"),
      U("detail-pool.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
    ],
    packages: [
      {
        title: "PADI courses at Jalyn’s",
        price: "See Scuba Diving page for rates",
        image: U("padi-advanced-open-water-students-puerto-galera.jpg"),
        amenities: [
          "Discover Scuba",
          "Open Water",
          "Advanced Open Water",
          "Fun dives & night dives",
        ],
      },
    ],
  },
  "scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site": {
    gallery: [
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("detail-pool.jpg"),
      U("jalyns-resort-puerto-galera-boat-trips.jpg"),
    ],
    packages: [
      {
        title: "Dive Canyons & more",
        price: "Fun dive rates on Scuba page",
        image: U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
        amenities: [
          "Signature Puerto Galera sites",
          "Experienced local guides",
          "Own dive boats",
          "Up to 3 dives daily",
        ],
      },
    ],
  },
  "our-commitment-to-responsible-ecotourism-in-marine-protected-areas": {
    packages: [
      {
        title: "Support Blue Alliance Philippines",
        price: "₱50 per dive pledge",
        image: U("hawksbill-turtle-puerto-galera.jpg"),
        amenities: [
          "Responsible dive practices",
          "Marine protected areas",
          "Community support",
          "Guest speaker events",
        ],
      },
    ],
  },
  "spa-services-jalyns-resort": {
    body: `Relax with spa services at Jalyn’s Resort — massages and treatments designed to unwind after a day of diving or exploring Puerto Galera.

## Spa at the resort

- Massage treatments
- Ideal after diving
- Book at the resort
- Pair with a pool day or dinner

Visit our Spa page for the full treatment menu, or ask reception to book.`,
    gallery: [
      U("spa-service-jalyns-resort-blog.jpg"),
      U("detail-spa.jpg"),
      U("detail-pool.jpg"),
      U("detail-main-building.jpg"),
      U("detail-apartment.jpg"),
      U("valentines-day-puerto-galera-resort.jpg"),
    ],
  },
  "kayaks-now-available-to-rent": {
    body: `Jalyn’s Resort now has two double-seater kayaks and three single-seater kayaks available for rental. A great way to explore Mangrove Cove and the calm waters around the resort.

## Kayak rental

- 2 double-seater kayaks
- 3 single-seater kayaks
- Explore Mangrove Cove
- Life jackets available

Ask front desk for hourly and daily rates.`,
    gallery: [
      U("kayak-rental-puerto-galera-jalyns-resort.jpg"),
      U("detail-kayak.jpg"),
      U("detail-boat.jpg"),
      U("detail-pool.jpg"),
      U("jalyns-resort-puerto-galera-boat-trips.jpg"),
      U("detail-main-building.jpg"),
    ],
  },
  "may-promo-fun-dives-only-php999-at-jalyns-resort-dive-center": {
    body: `From May 5th until May 31st Jalyn’s Resort Dive Center offered Fun Dives at a special promotional rate of ₱999.

Perfect for certified divers who want to explore Puerto Galera’s reefs without a full course commitment.

## Fun dive promo highlights

- Special promotional fun dive rate
- For certified divers
- Jalyn’s Resort Dive Center
- Puerto Galera dive sites

Contact us for current fun dive pricing and schedules.`,
    gallery: [
      U("jalyns-resort-puerto-galera-may-2023-scuba-diving-promo.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("detail-pool.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
    ],
  },
  "apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera": {
    body: `Jalyn’s Resort is pleased to announce that we have One and Two-Bedroom apartments available for longer stays in Puerto Galera.

Enjoy solar/battery power, pools, wifi, and easy access to diving and dining — ideal for couples and families looking for an extended stay.

## Apartments

- One & two-bedroom options
- Solar / battery powered
- Pool access
- Kitchen facilities
- Wifi & cable TV
- Close to dive centre & restaurant

Contact us for monthly rates and availability.`,
    gallery: [
      U("jalyns-resort-puerto-galera-main-building.jpg"),
      U("detail-apartment.jpg"),
      U("apartment-to-rent-puerto-galera.jpg"),
      U("detail-pool.jpg"),
      U("detail-main-building.jpg"),
      U("pools-and-solar-1.jpg"),
    ],
  },
  "jalyns-resort-is-offering-monthly-accommodation-rates-starting-from-april-2020": {
    body: `1 bedroom apartment well suited for couple or family with 1 child. Free access to swimming pools and other resort amenities.

Ideal for longer stays in Puerto Galera with the comfort of home and resort facilities on site.

## Monthly accommodation

- 1-bedroom apartment
- Suited for couple or family with 1 child
- Free swimming pool access
- Resort amenities included
- Wifi available

Inquire for current monthly rates.`,
    gallery: [
      U("apartment-to-rent-puerto-galera.jpg"),
      U("detail-apartment.jpg"),
      U("detail-main-building.jpg"),
      U("detail-pool.jpg"),
      U("pools-and-solar-1.jpg"),
      U("jalyns-resort-puerto-galera-main-building.jpg"),
    ],
  },
};

function uniqueGallery(primary, extras) {
  const seen = new Set();
  const out = [];
  for (const u of [primary, ...extras, ...POOL]) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 6) break;
  }
  return out;
}

function defaultPackage(post) {
  const bullets = (post.body || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2))
    .slice(0, 8);
  return {
    title: post.title.length > 48 ? post.title.slice(0, 46) + "…" : post.title,
    price: post.price || "Contact us for details",
    image: post.image,
    amenities:
      bullets.length > 0
        ? bullets
        : [
            post.category,
            "Photos & full details below",
            "Contact Jalyn’s Resort to inquire",
            "Puerto Galera, Oriental Mindoro",
          ],
  };
}

let updated = 0;
for (const post of store.posts) {
  const spec = SPECIFIC[post.id] || {};
  if (spec.price) post.price = spec.price;
  if (spec.body) post.body = spec.body;
  if (spec.gallery) {
    post.gallery = spec.gallery;
  } else {
    post.gallery = uniqueGallery(post.image, post.gallery || []);
  }
  if (spec.packages) {
    post.packages = spec.packages;
  } else if (!post.packages || post.packages.length === 0) {
    post.packages = [defaultPackage(post)];
  }
  // Guarantee gallery length
  if ((post.gallery || []).length < 4) {
    post.gallery = uniqueGallery(post.image, post.gallery || []);
  }
  updated += 1;
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log(`Updated all ${updated} news posts with galleries + packages.`);
