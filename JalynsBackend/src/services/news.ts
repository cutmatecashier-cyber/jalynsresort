import { randomUUID } from 'node:crypto'
import { createJsonCloudStore } from './jsonCloudStore.js'

export type NewsKind = 'news' | 'offer' | 'event'

export type NewsPackage = {
  title: string
  price?: string
  image?: string
  amenities?: string[]
  body?: string
}

export type NewsPost = {
  id: string
  category: string
  title: string
  excerpt: string
  body: string
  image: string
  cta: string
  href: string
  kind: NewsKind
  date: string
  price?: string
  gallery?: string[]
  packages?: NewsPackage[]
  /** YouTube embed URL when the live article includes a video */
  videoUrl?: string
}

/** Older short ids (frontend fallback / bookmarks) → current news.json slugs */
const LEGACY_NEWS_IDS: Record<string, string> = {
  'studio-apartments-long-term':
    'studio-apartments-available-for-long-term-rental-at-jalyns-resort',
  'phidex-2024': 'phidex-2024-dive-expo',
  'ecotourism-mpa': 'our-commitment-to-responsible-ecotourism-in-marine-protected-areas',
  'padi-aow-review': 'padi-advanced-open-water-students-review',
  'canyons-jacks': 'scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site',
  'rooms-scuba-offer': 'rooms-scuba-diving-special-offer',
  'single-double-long-term':
    'single-double-rooms-available-for-long-term-rental-at-jalyns-resort',
  'apartments-long-term':
    'apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera',
  'aldaw-kapiya-an-2023': 'puerto-galera-aldaw-kapiya-an-festival-2023',
}

export const DEFAULT_NEWS: NewsPost[] = ([
  {
    id: 'studio-apartments-available-for-long-term-rental-at-jalyns-resort',
    category: 'News',
    kind: 'news',
    date: '2024-08-20',
    title: 'Studio Apartments available for long-term rental at Jalyn’s Resort',
    excerpt:
      'Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and the relaxed Mangrove Cove lifestyle.',
    image: '/uploads/news/pools-and-solar-1.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/studio-apartments-available-for-long-term-rental-at-jalyns-resort/',
  },
  {
    id: 'phidex-2024-dive-expo',
    category: 'Events',
    kind: 'event',
    date: '2024-03-20',
    title: 'PHIDEX 2024 Dive Expo',
    excerpt:
      'The 2024 Philippines International Dive Expo was a great success, and we were proud to represent Puerto Galera diving with Jalyn’s Resort Dive Center.',
    image:
      '/uploads/news/429317172-1651854885631461-47893951982924994-n.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/phidex-2024-dive-expo/',
  },
  {
    id: 'our-commitment-to-responsible-ecotourism-in-marine-protected-areas',
    category: 'News',
    kind: 'news',
    date: '2023-12-06',
    title: 'Our Commitment to Responsible Ecotourism in Marine Protected Areas',
    excerpt:
      'Jalyn’s Resort and Jalyn’s Resort Dive Center are proud to announce our commitment to promoting responsible ecotourism in marine protected areas.',
    image: '/uploads/news/hawksbill-turtle-puerto-galera.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/our-commitment-to-responsible-ecotourism-in-marine-protected-areas/',
  },
  {
    id: 'padi-advanced-open-water-students-review',
    category: 'News',
    kind: 'news',
    date: '2023-11-30',
    title: 'PADI Advanced Open Water Students Review',
    excerpt:
      'Jalyn’s Resort Scuba Diving Center offers everything from daily fun dives and exciting night dives, to full PADI courses for advancing divers.',
    image:
      '/uploads/news/padi-advanced-open-water-students-puerto-galera.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/padi-advanced-open-water-students-review/',
  },
  {
    id: 'scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site',
    category: 'News',
    kind: 'news',
    date: '2023-11-06',
    title: 'Scuba Diving with a huge school of Jacks at Canyons dive site',
    excerpt:
      '“Canyons” is Puerto Galera’s signature exhilarating drift dive, not for novice divers. Drop in at the right time and you may swim with a huge school of jacks.',
    image:
      '/uploads/news/scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site/',
  },
  {
    id: 'rooms-scuba-diving-special-offer',
    category: 'Special Offers',
    kind: 'offer',
    date: '2023-09-17',
    title: 'Rooms & Scuba Diving Special Offer!',
    excerpt:
      'To mark the Sabang Oktoberfest celebration Jalyn’s Resort is offering 5 days/4 nights accommodation and scuba diving packages.',
    image:
      '/uploads/news/rooms-diving-special-offer-jalyns-resort-puerto-galera.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/rooms-scuba-diving-special-offer/',
  },
  {
    id: 'single-double-rooms-available-for-long-term-rental-at-jalyns-resort',
    category: 'News',
    kind: 'news',
    date: '2023-09-08',
    title: 'Single & Double Rooms available for long-term rental at Jalyn’s Resort',
    excerpt:
      'Take advantage of our extended-stay room rentals and experience the full array of amenities, conveniences, and easy access to diving and dining.',
    image: '/uploads/news/pools-and-solar-1.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/single-double-rooms-available-for-long-term-rental-at-jalyns-resort/',
  },
  {
    id: 'sabang-oktoberfest-2023',
    category: 'Events',
    kind: 'event',
    date: '2023-07-31',
    title: 'Sabang Oktoberfest 2023',
    excerpt:
      'If you are going to be in Puerto Galera this October, be sure to check out Sabang Oktoberfest — music, food, and celebration along the beach strip.',
    image:
      '/uploads/news/sabang-oktoberfest-2023-puerto-galera.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/sabang-oktoberfest-2023/',
  },
  {
    id: 'apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera',
    category: 'News',
    kind: 'news',
    date: '2023-06-08',
    title: 'Apartments Available for Long-Term Rental at Jalyn’s Resort, Puerto Galera',
    excerpt:
      'Jalyn’s Resort is pleased to announce that we now have One and Two-Bedroom apartments available for longer stays in Puerto Galera.',
    image:
      '/uploads/news/jalyns-resort-puerto-galera-main-building.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/apartments-available-for-long-term-rental-at-jalyns-resort-puerto-galera/',
  },
  {
    id: 'puerto-galera-aldaw-kapiya-an-festival-2023',
    category: 'Events',
    kind: 'event',
    date: '2023-06-05',
    title: 'Puerto Galera Aldaw Kapiya-An Festival 2023',
    excerpt:
      'From June 5th – 12th 2023, Puerto Galera hosted the Aldaw Kapiya-An Festival — culture, community, and celebration across the municipality.',
    image:
      '/uploads/news/puerto-galera-independence-day-festival-1.jpg',
    cta: 'Read more',
    href: 'https://jalynsresort.com/puerto-galera-aldaw-kapiya-an-festival-2023/',
  },
] as Array<Omit<NewsPost, 'body'>>).map((p) => ({
  ...p,
  body: p.excerpt,
  href: `/news/${p.id}`,
}))

const MAX_POSTS = 60

type StoreShape = { posts: NewsPost[] }

function categoryForKind(kind: NewsKind) {
  if (kind === 'event') return 'Events'
  if (kind === 'offer') return 'Special Offers'
  return 'News'
}

function normalizeKind(raw: unknown): NewsKind {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'event' || v === 'events') return 'event'
  if (v === 'offer' || v === 'offers' || v === 'special offers') return 'offer'
  return 'news'
}

function normalizeDate(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

function normalizeGallery(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const urls = raw
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u) => u && (u.startsWith('/') || /^https?:\/\//i.test(u) || u.startsWith('data:')))
  return urls.length ? urls : undefined
}

function normalizePackages(raw: unknown): NewsPackage[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const packages = raw
    .map((row) => {
      const item = (row && typeof row === 'object' ? row : {}) as Partial<NewsPackage>
      const title = typeof item.title === 'string' ? item.title.trim() : ''
      if (!title) return null
      const amenities = Array.isArray(item.amenities)
        ? item.amenities.map((a) => String(a).trim()).filter(Boolean)
        : undefined
      const image =
        typeof item.image === 'string' && item.image.trim() ? item.image.trim() : undefined
      const price =
        typeof item.price === 'string' && item.price.trim() ? item.price.trim() : undefined
      const body = typeof item.body === 'string' && item.body.trim() ? item.body.trim() : undefined
      return { title, price, image, amenities, body } satisfies NewsPackage
    })
    .filter((p): p is NewsPackage => Boolean(p))
  return packages.length ? packages : undefined
}

function normalizePosts(raw: unknown): NewsPost[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return []
  }
  const posts = raw
    .map((row) => {
      const item = (row && typeof row === 'object' ? row : {}) as Partial<NewsPost>
      const title = typeof item.title === 'string' ? item.title.trim() : ''
      const image = typeof item.image === 'string' ? item.image.trim() : ''
      if (!title || !image) return null
      const kind = normalizeKind(item.kind)
      const excerpt = typeof item.excerpt === 'string' ? item.excerpt.trim() : ''
      const bodyRaw = typeof item.body === 'string' ? item.body.trim() : ''
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `news-${randomUUID().slice(0, 8)}`
      const price =
        typeof item.price === 'string' && item.price.trim() ? item.price.trim() : undefined
      const gallery = normalizeGallery(item.gallery)
      const packages = normalizePackages(item.packages)
      const videoUrl =
        typeof item.videoUrl === 'string' && /youtube\.com\/embed\//i.test(item.videoUrl.trim())
          ? item.videoUrl.trim()
          : undefined
      return {
        id,
        category:
          typeof item.category === 'string' && item.category.trim()
            ? item.category.trim()
            : categoryForKind(kind),
        title,
        excerpt,
        body: bodyRaw || excerpt,
        image,
        cta: typeof item.cta === 'string' && item.cta.trim() ? item.cta.trim() : 'Read more',
        href:
          typeof item.href === 'string' && item.href.trim()
            ? item.href.trim()
            : `/news/${id}`,
        kind,
        date: normalizeDate(item.date),
        ...(price ? { price } : {}),
        ...(gallery ? { gallery } : {}),
        ...(packages ? { packages } : {}),
        ...(videoUrl ? { videoUrl } : {}),
      } satisfies NewsPost
    })
    .filter((p): p is NewsPost => Boolean(p))
  return posts.length > 0
    ? posts.slice(0, MAX_POSTS).sort((a, b) => b.date.localeCompare(a.date))
    : []
}

const cloudStore = createJsonCloudStore<StoreShape>({
  cloudObject: 'news.json',
  parse: (raw) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as { posts?: unknown }
    return { posts: normalizePosts(row.posts) }
  },
  serialize: (value) => value,
  defaultValue: () => ({ posts: DEFAULT_NEWS.map((p) => ({ ...p })) }),
  emptyValue: () => ({ posts: [] }),
  hasContent: (value) => value.posts.length > 0,
})

export async function listNews(): Promise<NewsPost[]> {
  const loaded = await cloudStore.load()
  return loaded.posts.length > 0 ? loaded.posts : DEFAULT_NEWS.map((p) => ({ ...p }))
}

export function validateNewsInput(input: {
  title?: unknown
  excerpt?: unknown
  body?: unknown
  image?: unknown
  cta?: unknown
  href?: unknown
  kind?: unknown
  date?: unknown
  category?: unknown
  price?: unknown
  gallery?: unknown
  packages?: unknown
  videoUrl?: unknown
}) {
  const title = String(input.title ?? '').trim()
  if (title.length < 4) throw new Error('Title must be at least 4 characters.')
  const bodyRaw = String(input.body ?? '').trim()
  let excerpt = String(input.excerpt ?? '').trim()
  if (!excerpt && bodyRaw) {
    const flat = bodyRaw.replace(/\s+/g, ' ')
    excerpt =
      flat.length <= 180
        ? flat
        : `${flat.slice(0, 180).replace(/\s+\S*$/, '').trim() || flat.slice(0, 180).trim()}…`
  }
  if (excerpt.length < 10) throw new Error('Full article must be at least 10 characters.')
  const body = bodyRaw || excerpt
  const image = String(input.image ?? '').trim()
  if (!image) throw new Error('Image is required.')
  if (!image.startsWith('/') && !/^https?:\/\//i.test(image) && !image.startsWith('data:')) {
    throw new Error('Enter a valid image URL or upload a picture.')
  }
  const kind = normalizeKind(input.kind)
  const cta = String(input.cta ?? '').trim() || 'Read more'
  const date = normalizeDate(input.date)
  const category = String(input.category ?? '').trim() || categoryForKind(kind)
  const priceRaw = String(input.price ?? '').trim()
  const price = priceRaw || undefined
  const gallery = normalizeGallery(input.gallery)
  const packages = normalizePackages(input.packages)
  const videoRaw = String(input.videoUrl ?? '').trim()
  const videoUrl = /youtube\.com\/embed\//i.test(videoRaw) ? videoRaw : undefined
  return {
    title,
    excerpt,
    body,
    image,
    cta,
    kind,
    date,
    category,
    ...(price ? { price } : {}),
    ...(gallery ? { gallery } : {}),
    ...(packages ? { packages } : {}),
    ...(videoUrl ? { videoUrl } : {}),
  }
}

export async function createNewsPost(
  input: Parameters<typeof validateNewsInput>[0],
): Promise<NewsPost[]> {
  const data = validateNewsInput(input)
  const current = await cloudStore.load()
  const base = current.posts.length > 0 ? current.posts : DEFAULT_NEWS.map((p) => ({ ...p }))
  if (base.length >= MAX_POSTS) {
    throw new Error(`You can publish up to ${MAX_POSTS} news posts.`)
  }
  const id = randomUUID()
  const post: NewsPost = { id, ...data, href: `/news/${id}` }
  const posts = [post, ...base].slice(0, MAX_POSTS)
  await cloudStore.save({ posts })
  return posts
}

export async function updateNewsPost(
  id: string,
  input: Parameters<typeof validateNewsInput>[0],
): Promise<NewsPost[]> {
  const data = validateNewsInput(input)
  const current = await cloudStore.load()
  const base = current.posts.length > 0 ? current.posts : DEFAULT_NEWS.map((p) => ({ ...p }))
  const idx = base.findIndex((p) => p.id === id)
  if (idx < 0) throw new Error('News post not found.')
  // Preserve packages/video when client omits them; allow clearing gallery/price when sent
  const prev = base[idx]
  const hasGallery = Array.isArray(input.gallery)
  const hasPrice = Object.prototype.hasOwnProperty.call(input, 'price')
  const hasPackages = Array.isArray(input.packages)
  const hasVideo = Object.prototype.hasOwnProperty.call(input, 'videoUrl')
  const nextPosts = [...base]
  nextPosts[idx] = {
    id,
    ...data,
    href: `/news/${id}`,
    price: hasPrice ? data.price : prev.price,
    gallery: hasGallery ? data.gallery ?? [] : prev.gallery,
    packages: hasPackages ? data.packages : prev.packages,
    videoUrl: hasVideo ? data.videoUrl : prev.videoUrl,
  }
  const posts = nextPosts.sort((a, b) => b.date.localeCompare(a.date))
  await cloudStore.save({ posts })
  return posts
}

export async function getNewsPost(id: string): Promise<NewsPost | null> {
  const raw = decodeURIComponent(String(id || '').trim()).replace(/^\/+|\/+$/g, '')
  if (!raw) return null
  const posts = await listNews()
  const direct = posts.find((p) => p.id === raw)
  if (direct) return direct

  const aliased = LEGACY_NEWS_IDS[raw]
  if (aliased) {
    const hit = posts.find((p) => p.id === aliased)
    if (hit) return hit
  }

  // Short slug → unique longer slug (e.g. phidex-2024 → phidex-2024-dive-expo)
  const prefixed = posts.filter(
    (p) => p.id.startsWith(`${raw}-`) || p.id.startsWith(`${raw}/`) || p.id === raw,
  )
  if (prefixed.length === 1) return prefixed[0]

  return null
}

export async function deleteNewsPost(id: string): Promise<NewsPost[]> {
  const current = await cloudStore.load()
  const base = current.posts.length > 0 ? current.posts : DEFAULT_NEWS.map((p) => ({ ...p }))
  const next = base.filter((p) => p.id !== id)
  if (next.length === base.length) throw new Error('News post not found.')
  await cloudStore.save({ posts: next })
  return next
}
