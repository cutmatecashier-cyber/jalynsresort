/**
 * Sync major news posts to live WP article structure
 * (bold prices, headings, amenity lists, packages, galleries).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "news.json");
const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const U = (n) => `/uploads/news/${n}`;
const FB = "https://www.facebook.com/jalynsresortpuertogalera";

const amenityStudio = [
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

const amenitySingle = [
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

const amenityDouble = [
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

/** @type {Record<string, object>} */
const PATCHES = {
  "single-double-rooms-available-for-long-term-rental-at-jalyns-resort": {
    price: "From P18k/month",
    body: `Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and breathtaking views at Jalyn’s Resort!

Notably, Jalyn’s Resort is equipped with Solar Power and Battery backups, ensuring uninterrupted access to essential services during power outages. Say goodbye to midnight surprises of your air-conditioning shutting off!

## Single Rooms

**P18k/month including Electricity + 1 month deposit.**

- ${amenitySingle.join("\n- ")}

## Double Rooms

**P25k/month + 1 month deposit.**

- ${amenityDouble.join("\n- ")}

## Contact us for Inquiries

If you are interested in renting one of these apartment, or have any questions, please send us a message or contact us through our [Facebook Page](${FB}).`,
    gallery: [
      U("pools-and-solar-1.jpg"),
      U("detail-main-building.jpg"),
      U("detail-apartment.jpg"),
      U("detail-pool.jpg"),
      U("jalyns-resort-puerto-galera-main-building.jpg"),
      U("apartment-to-rent-puerto-galera.jpg"),
    ],
    packages: [
      {
        title: "Single Rooms",
        price: "P18k/month including Electricity + 1 month deposit",
        image: U("detail-main-building.jpg"),
        amenities: amenitySingle,
      },
      {
        title: "Double Rooms",
        price: "P25k/month + 1 month deposit",
        image: U("detail-apartment.jpg"),
        amenities: amenityDouble,
      },
    ],
  },

  "rooms-scuba-diving-special-offer": {
    price: "₱18,000 per person",
    body: `To mark the Sabang Okctoberfest celebration Jalyn’s Resort is offering 5 days/4 nights accommodation and 10 scuba dives for the low price of **₱18,000 per person!**

This offer is available from September 15th – December 23rd 2023, and again from January 15th – March 24th 2024!

Expect great service, modern and comfortable rooms and all the wonderful amenities Jalyn’s Resort has to offer! And Jalyn’s Resort has an independent Solar Power and battery system, so you’ll never have to experience the inconvenience of brownouts when staying with us.

Contact us now for inquiries or bookings!

**Email:** info@jalynsresort.com

**Telephone (Smart):** +63 947 619 7535

**Social Media:** [Facebook](${FB})`,
    gallery: [
      U("rooms-diving-special-offer-jalyns-resort-puerto-galera.jpg"),
      U("detail-rooms-dive.jpg"),
      U("detail-pool.jpg"),
      U("detail-boat.jpg"),
      U("detail-main-building.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
    ],
    packages: [
      {
        title: "5D/4N Rooms + 10 Scuba Dives",
        price: "₱18,000 per person",
        image: U("detail-rooms-dive.jpg"),
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

  "discover-scuba-diving-in-beautiful-puerto-galera-at-jalyns-resort-dive-center": {
    price: "Php 2,400",
    body: `### The PADI Discover Scuba Diving certification is available for kids age 10 and up!

These two lucky Danish boys aged 10 and 11 recently did their PADI Discover Scuba Diving course with us and were introduced to the incredible marine life of Puerto Galera during their two dives in the ocean, and were lucky enough to see crocodile fish and a sea turtle!

If you have kids aged 10 or older and would like to introduce them to the wonderful world of Scuba Diving, Puerto Galera is the ideal place to do it. The warm, calm waters are teeming with an incredible amount and variety of sea life, and the experience will stay in their memories for ever!

## About the PADI Discover Scuba Diving Course

If you’re interested in scuba diving, but unsure if you want to enroll in a scuba certification class, Discover Scuba Diving is the perfect way to test the waters. In a very short time, you’ll learn basic scuba skills and take your first breaths underwater.

- Anyone aged 10 and up with with a minimum level of health and fitness can partake in the PADI DSD.
- Chronic health conditions, certain medications and/or recent surgery may require you to get written approval from a physician before diving.

### PADI eLearning

Prepare for your Discover Scuba Diving experience with PADI DSD eLearning™. Use your computer or mobile device to learn diving safety fundamentals before you get in the water.

Time commitment: 20-30 minutes

### With Your Instructor

Your PADI instructor will fit you with scuba gear and explain how to use it in the controlled environment of our swimming pool. You’ll practice basic diving skills followed by free time to play underwater before going on your first guided dive in the open water.

## Discover Scuba Diving Course cost

**Php 2,400 includes equipment, 1 pool session and 1 open water dive. Certification excluded.**

## Get in Touch!

Contact us if you would like to inquire about getting your own PADI Discover Scuba Diving Course at Jalyn’s Resort!`,
    gallery: [
      U("discover-scuba-diving-jalyns-resort-puerto-galera.jpg"),
      U("detail-pool.jpg"),
      U("detail-boat.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
      U("detail-rooms-dive.jpg"),
    ],
    packages: [
      {
        title: "PADI Discover Scuba Diving",
        price: "Php 2,400 — equipment, 1 pool session & 1 open water dive",
        image: U("discover-scuba-diving-jalyns-resort-puerto-galera.jpg"),
        amenities: [
          "Ages 10 and up",
          "1 pool training session",
          "1 guided open water dive",
          "Equipment included",
          "Certification excluded",
          "eLearning ~20–30 minutes",
        ],
      },
    ],
  },

  "padi-open-water-diver-courses-at-jalyns-resort": {
    price: "P18,000",
    body: `Congratulations to our most recent PADI Open Water Diver student Joan, who completed her Open Water Diver course with flying colours, with her PADI instructor Volker.

The PADI Open Water Diver course can be completed in as little as 3 days, and costs **P18,000 including equipment and certification.**

## About the PADI Open Water Diver Course

PADI® Open Water Diver is the first scuba certification level. A highly-trained PADI Instructor will teach you how to scuba dive in a relaxed, supportive learning environment.

By the end of the course, you’ll have the skills and knowledge to dive at home or abroad and be an ambassador for the underwater world.

### Theoretical Studies

The theoretical part of the Open Water Course can either be done at your dive center, or in your own time via PADI eLearning, makes it easy to fit scuba lessons into a busy schedule. Learn about scuba diving principles and terminology whenever, wherever it’s convenient for you.

It’s your course on your time. Study offline, or online using a computer or mobile device. Connect with your instructor whenever you have a question.

- eLearning time commitment: 5-10 hours

### Practical Skills

Practice using scuba gear in a pool (or pool-like environment) until you’re comfortable. PADI training includes practice “mini dives” to help you build confidence in your new abilities before making four dives in open water.

- Prerequisites: Able to swim; medically fit for diving
- Total time commitment: 4-7 days
- Minimum age: 10 years or older
- Depth: expect shallow dives (12m/40ft), the maximum allowed depth is 18m/60ft

Contact us if you would like to inquire about getting your own PADI Open Water Diver qualification at Jalyn’s Resort!`,
    gallery: [
      U("padi-open-water-diver-course-jalyns-resort-puerto-galera.jpg"),
      U("detail-pool.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("detail-main-building.jpg"),
    ],
    packages: [
      {
        title: "PADI Open Water Diver",
        price: "P18,000 including equipment & certification",
        image: U("padi-open-water-diver-course-jalyns-resort-puerto-galera.jpg"),
        amenities: [
          "First scuba certification level",
          "Equipment included",
          "PADI certification included",
          "Pool practice + 4 open water dives",
          "About 3–7 days",
          "Ages 10+",
        ],
      },
    ],
  },

  "padi-advanced-open-water-course-at-jalyns-resort-dive-center": {
    price: "Php14,500",
    body: `What better place to do your PADI Advanced Open Water Course than beautiful Puerto Galera?

## About the PADI Advanced Open Water Course

The Advanced Open Water Diver course is all about advancing your skills. You’ll practice navigation and buoyancy, try deep diving and make three specialty dives of your choosing (it’s like a specialty sampler platter). For every specialty dive you complete, you can earn credit toward PADI specialty certifications.

Here are a few of the many options: Deep, Digital Underwater Photography, Dive Against Debris, Dry Suit, Enriched Air Nitrox, Fish Identification, Night, Peak Performance Buoyancy, Search & Recovery, Underwater Naturalist, Underwater Navigation, and Wreck Diver.

## How to Become an Advanced Open Water Diver

### PADI eLearning

Advanced Open Water Diver eLearning includes interactive lessons on 13 popular specialty dives: altitude, boat, digital underwater imaging, drift, dry suit, fish ID, night, buoyancy, search and recovery, underwater naturalist and wreck diving. You’ll study deep and navigation diving plus three specialties of your choosing.

eLearning time commitment: 6-8 hours

### With Your Instructor

The course includes 3 dives. Gain experience, build confidence and discover your diving abilities.

- Prerequisites: Open Water Diver/Junior Open Water Diver (or qualifying certification)
- Total time commitment: 2 days
- Minimum age: 12 years or older
- Depth: The maximum depth depends on your age, but maximum depth is up to 30 metres/100 feet

## Advanced Open Water Diver Course cost

**Php14,500 includes equipment and certification, and three open water dives over two days.**

## Get in Touch!

Contact us if you would like to inquire about getting your own PADI Advanced Open Water Diver qualification at Jalyn’s Resort!

Visit our Scuba Diving page for more information about fun diving and courses at Jalyn’s Resort Dive Center!`,
    gallery: [
      U("padi-advanced-open-water-scuba-course-puerto-galera.jpg"),
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("detail-pool.jpg"),
    ],
    packages: [
      {
        title: "PADI Advanced Open Water Diver",
        price: "Php14,500 including equipment & certification",
        image: U("padi-advanced-open-water-scuba-course-puerto-galera.jpg"),
        amenities: [
          "Deep + navigation + specialty dives",
          "Equipment included",
          "Certification included",
          "About 2 days / 3 dives",
          "Ages 12+",
          "Requires Open Water certification",
        ],
      },
    ],
  },

  "our-commitment-to-responsible-ecotourism-in-marine-protected-areas": {
    price: "P50 per dive pledge",
    body: `Jalyn’s Resort and Jalyn’s Resort Dive Center are proud to announce our commitment to promoting responsible ecotourism in our precious Marine Protected Areas, and our ongoing support of [Blue Alliance Philippines](https://divemindoro.org/), an NGO committed to safeguarding marine ecosystems and improving the lives of coastal communities in North Oriental Mindoro, Philippines.

At Jalyn’s Resort Dive Center we instruct divers how to follow best practices to minimize any harm to marine life. These best practices include both obvious and subtle steps, but they’re all crucial for maintaining the health and beauty of the North Oriental Mindoro MPA network for future generations to enjoy. We will also be hosting guest speakers to explain more about Blue Alliance Philippines’ mission and motivations in protecting our most valuable resource.

## Why following best practices is crucial in Oriental Mindoro

Coral reefs in the area are highly vulnerable and can take years to recover from damage due to their slow growth rate. The diverse marine life, including fish, have specialized diets that do not include snacks from divers. Your actions while exploring the underwater world of Oriental Mindoro can have a tangible impact – from discarding litter to carelessly kicking with fins or leaving bubbles in tunnels and caves. It’s essential to take precautions to preserve the beauty and delicate balance of the region’s underwater ecosystems.

## Fundraising

Jalyn’s Resort is committed to ongoing support of Blue Alliance Philippines, and encourage our guest divers to do the same. If each diver pledges just a small amount such as **P50 per dive**, these donations will help in bolstering enforcement, fostering community development, advancing scientific research, and empowering local communities. Together, we can create a sustainable ocean future for generations to come!

As someone who loves to explore the beauty of Marine Protected Areas, **YOU** have the power to contribute to its preservation through responsible marine ecotourism. We look forward to hosting you to enjoy some of the best scuba diving in the world in beautiful Puerto Galera, where you can do your part to support our communities and protect our oceans and wildlife.

We hope to see you soon!`,
    gallery: [
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
      U("detail-boat.jpg"),
      U("detail-pool.jpg"),
      U("detail-rooms-dive.jpg"),
      U("detail-main-building.jpg"),
    ],
    packages: [
      {
        title: "Support Blue Alliance Philippines",
        price: "P50 per dive pledge",
        image: U("hawksbill-turtle-puerto-galera.jpg"),
        amenities: [
          "Responsible dive practices",
          "Marine protected areas",
          "Community support",
          "Scientific research",
          "Guest speaker events",
        ],
      },
    ],
  },

  "no-more-brownouts-jalyns-resort-goes-solar": {
    price: "Solar + battery backup",
    body: `Jalyn’s Resort is delighted to announce that we are no longer completely dependent on electricity from the grid! Our Solar Power setup covers all our electrical and hot water needs, with a battery system for overnight coverage.

For our valued guests this means vital amenities will work without interruption. No waking up in the middle of the night to discover the air-conditioning has switched off!

At Jalyn’s Resort we are constantly striving to ensure our guests have the best possible experience while staying with us. We hope you will be joining us to enjoy a spectacular tropical adventure in Puerto Galera.

## Background on the power situation in Puerto Galera

Puerto Galera has faced frequent brownouts and problems with electricity supply since 2020, with a significant increase in brownouts during 2022. These power interruptions have not only affected the daily lives of residents, but have also disrupted the local tourism industry.

The root cause of the power interruptions is the inadequate generation capacity of the local power utility, which has struggled to keep up with the growing demand for electricity in the area. This has resulted in frequent brownouts, particularly during peak hours, when residents and tourists need electricity the most.

The situation has become so severe that local businesses, particularly those in the hospitality industry, have had to resort to using backup generators to ensure that they can continue to provide essential services to their customers. This has added an extra cost burden to these businesses, which are already struggling due to the impact of the COVID-19 pandemic on tourism.

Moreover, the frequent power interruptions have also impacted the local economy as a whole, as many businesses have had to reduce their operating hours or even close down due to the lack of reliable electricity.`,
    gallery: [
      U("no-more-brownouts-jalyns-resort-goes-solar.jpg"),
      U("pools-and-solar-1.jpg"),
      U("detail-pools-solar.jpg"),
      U("detail-main-building.jpg"),
      U("detail-pool.jpg"),
      U("detail-apartment.jpg"),
    ],
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

  "phidex-2024-dive-expo": {
    body: `The 2024 Philippines International Dive Expo was a great a success, and we were proud to be involved, and see Puerto Galera so well represented by many dive operators and local officials.

We had the pleasure of meeting and talking with so many great people, and we hope the Expo will bring many more scuba diving enthusiasts to discover the incredible tropical reef diving in Puerto Galera.

To find out more about Scuba Diving and PADI Scuba Courses, visit our Scuba Diving page.

We hope to see you here!`,
    gallery: [
      U("429317172-1651854885631461-47893951982924994-n.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
      U("detail-pool.jpg"),
    ],
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

  "apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera": {
    price: "Long-term rates available",
    body: `Jalyn’s Resort is pleased to announce that we now have One and Two-Bedroom apartments available for longer stays in Puerto Galera.

Enjoy solar/battery power, pools, wifi, and easy access to diving and dining — ideal for couples and families looking for an extended stay.

## Apartments

**Contact us for monthly rates.**

- One & two-bedroom options
- Solar / battery powered
- Pool access
- Kitchen facilities
- Wifi & cable TV
- Close to dive centre & restaurant

## Contact us for Inquiries

Please send us a message or contact us through our [Facebook Page](${FB}).`,
    gallery: [
      U("jalyns-resort-puerto-galera-main-building.jpg"),
      U("detail-apartment.jpg"),
      U("apartment-to-rent-puerto-galera.jpg"),
      U("detail-pool.jpg"),
      U("detail-main-building.jpg"),
      U("pools-and-solar-1.jpg"),
    ],
    packages: [
      {
        title: "One & Two-Bedroom Apartments",
        price: "Contact us for monthly rates",
        image: U("detail-apartment.jpg"),
        amenities: amenityStudio,
      },
    ],
  },

  "may-promo-fun-dives-only-php999-at-jalyns-resort-dive-center": {
    price: "Php999 Fun Dives",
    body: `From May 5th until May 31st Jalyn’s Resort Dive Center is offering Fun Dives only **Php999**!

Perfect for certified divers who want to explore Puerto Galera’s reefs without a full course commitment.

## Fun Dive Promo

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
    packages: [
      {
        title: "Fun Dive Promo",
        price: "Php999 per fun dive",
        image: U("jalyns-resort-puerto-galera-may-2023-scuba-diving-promo.jpg"),
        amenities: [
          "Certified divers",
          "Jalyn’s Resort Dive Center",
          "Puerto Galera dive sites",
          "Ask for current rates",
        ],
      },
    ],
  },

  "kayaks-now-available-to-rent": {
    price: "Kayak rental available",
    body: `Jalyn’s Resort now has two double-seater kayaks and (3) single-seater kayaks available for rental. A great way to explore Mangrove Cove and the calm waters around the resort.

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
    packages: [
      {
        title: "Kayak Rental",
        price: "Ask front desk for rates",
        image: U("detail-kayak.jpg"),
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
    body: `Relax with spa services at Jalyn’s Resort — massages and treatments designed to unwind after a day of diving or exploring Puerto Galera.

## Spa Services

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
    packages: [
      {
        title: "Spa Services",
        price: "See Spa page for full menu & rates",
        image: U("detail-spa.jpg"),
        amenities: [
          "Massage treatments",
          "Relax after diving",
          "Book at the resort",
        ],
      },
    ],
  },

  "jalyns-resort-is-offering-monthly-accommodation-rates-starting-from-april-2020": {
    price: "Monthly rates available",
    body: `1 bedroom apartment well suited for couple or family with 1 child. Free access to swimming pools and other resort amenities.

Ideal for longer stays in Puerto Galera with the comfort of home and resort facilities on site.

## Monthly accommodation

**Inquire for current monthly rates.**

- 1-bedroom apartment
- Suited for couple or family with 1 child
- Free swimming pool access
- Resort amenities included
- Wifi available

## Contact us for Inquiries

Please send us a message or contact us through our [Facebook Page](${FB}).`,
    gallery: [
      U("apartment-to-rent-puerto-galera.jpg"),
      U("detail-apartment.jpg"),
      U("detail-main-building.jpg"),
      U("detail-pool.jpg"),
      U("pools-and-solar-1.jpg"),
      U("jalyns-resort-puerto-galera-main-building.jpg"),
    ],
    packages: [
      {
        title: "1-Bedroom Apartment",
        price: "Monthly rate — inquire for pricing",
        image: U("detail-apartment.jpg"),
        amenities: [
          "Suited for couple or family with 1 child",
          "Free swimming pool access",
          "Resort amenities",
          "Wifi available",
        ],
      },
    ],
  },
};

let n = 0;
for (const post of store.posts) {
  const patch = PATCHES[post.id];
  if (!patch) continue;
  Object.assign(post, patch);
  n += 1;
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log(`Synced ${n} posts to live WP article structure.`);
