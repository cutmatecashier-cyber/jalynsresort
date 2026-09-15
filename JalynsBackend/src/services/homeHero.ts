import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type HomeHeroSlide = {
  id: string
  image: string
  alt: string
}

export type HomeSectionKey = 'whystay' | 'news'

export type HomeSections = Record<HomeSectionKey, string>

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const DATA_FILE = path.join(DATA_DIR, 'home-hero.json')

export const DEFAULT_HOME_SLIDES: HomeHeroSlide[] = [
  {
    id: 'pool',
    image:
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80',
    alt: "Infinity pool overlooking a tropical bay at Jalyn's Resort",
  },
  {
    id: 'cove',
    image:
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2400&q=80',
    alt: 'Resort lounge chairs facing turquoise water in Puerto Galera',
  },
  {
    id: 'deck',
    image:
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2400&q=80',
    alt: 'Sunset view from a seaside resort terrace',
  },
  {
    id: 'bay',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80',
    alt: 'Turquoise bay near Puerto Galera',
  },
]

export const DEFAULT_HOME_SECTIONS: HomeSections = {
  whystay:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80',
  news: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=2400&q=80',
}

const SECTION_KEYS: HomeSectionKey[] = ['whystay', 'news']

type StoreShape = {
  slides: HomeHeroSlide[]
  sections: HomeSections
}

function ensureStore() {
  mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) {
    writeFileSync(
      DATA_FILE,
      JSON.stringify(
        { slides: DEFAULT_HOME_SLIDES, sections: DEFAULT_HOME_SECTIONS },
        null,
        2,
      ),
      'utf8',
    )
  }
}

function normalizeSections(raw: unknown): HomeSections {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<HomeSections>
  return {
    whystay:
      typeof input.whystay === 'string' && input.whystay.trim()
        ? input.whystay.trim()
        : DEFAULT_HOME_SECTIONS.whystay,
    news:
      typeof input.news === 'string' && input.news.trim()
        ? input.news.trim()
        : DEFAULT_HOME_SECTIONS.news,
  }
}

function normalizeSlides(raw: unknown): HomeHeroSlide[] {
  if (!Array.isArray(raw) || raw.length !== DEFAULT_HOME_SLIDES.length) {
    return DEFAULT_HOME_SLIDES.map((s) => ({ ...s }))
  }
  return raw.map((slide, index) => {
    const row = (slide && typeof slide === 'object' ? slide : {}) as Partial<HomeHeroSlide>
    return {
      id: DEFAULT_HOME_SLIDES[index].id,
      alt:
        typeof row.alt === 'string' && row.alt.trim()
          ? row.alt.trim()
          : DEFAULT_HOME_SLIDES[index].alt,
      image:
        typeof row.image === 'string' && row.image.trim()
          ? row.image.trim()
          : DEFAULT_HOME_SLIDES[index].image,
    }
  })
}

function readStore(): StoreShape {
  ensureStore()
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Partial<StoreShape>
    return {
      slides: normalizeSlides(parsed.slides),
      sections: normalizeSections(parsed.sections),
    }
  } catch {
    return {
      slides: DEFAULT_HOME_SLIDES.map((s) => ({ ...s })),
      sections: { ...DEFAULT_HOME_SECTIONS },
    }
  }
}

function writeStore(store: StoreShape) {
  ensureStore()
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

export function isHomeSectionKey(value: string): value is HomeSectionKey {
  return SECTION_KEYS.includes(value as HomeSectionKey)
}

export function listHomeHeroSlides(): HomeHeroSlide[] {
  return readStore().slides
}

export function listHomeSections(): HomeSections {
  return readStore().sections
}

export function getHomeSection(key: HomeSectionKey): string {
  return readStore().sections[key]
}

export function updateHomeHeroSlide(
  index: number,
  patch: { image?: string; alt?: string },
): HomeHeroSlide[] {
  if (!Number.isInteger(index) || index < 0 || index >= DEFAULT_HOME_SLIDES.length) {
    throw new Error('Invalid slide index.')
  }
  const store = readStore()
  if (typeof patch.image === 'string' && patch.image.trim()) {
    store.slides[index] = { ...store.slides[index], image: patch.image.trim() }
  }
  if (typeof patch.alt === 'string' && patch.alt.trim()) {
    store.slides[index] = { ...store.slides[index], alt: patch.alt.trim() }
  }
  writeStore(store)
  return store.slides
}

export function resetHomeHeroSlide(index: number): HomeHeroSlide[] {
  if (!Number.isInteger(index) || index < 0 || index >= DEFAULT_HOME_SLIDES.length) {
    throw new Error('Invalid slide index.')
  }
  const store = readStore()
  store.slides[index] = { ...DEFAULT_HOME_SLIDES[index] }
  writeStore(store)
  return store.slides
}

export function resetAllHomeHeroSlides(): HomeHeroSlide[] {
  const store = readStore()
  store.slides = DEFAULT_HOME_SLIDES.map((s) => ({ ...s }))
  writeStore(store)
  return store.slides
}

export function updateHomeSection(key: HomeSectionKey, image: string): HomeSections {
  const store = readStore()
  store.sections[key] = image.trim()
  writeStore(store)
  return store.sections
}

export function resetHomeSection(key: HomeSectionKey): HomeSections {
  const store = readStore()
  store.sections[key] = DEFAULT_HOME_SECTIONS[key]
  writeStore(store)
  return store.sections
}
