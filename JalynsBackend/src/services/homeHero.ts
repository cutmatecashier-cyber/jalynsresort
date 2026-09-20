import { createJsonCloudStore } from './jsonCloudStore.js'

export type HomeHeroSlide = {
  id: string
  image: string
  alt: string
}

export type HomeSectionKey = 'whystay' | 'news'

export type HomeSections = Record<HomeSectionKey, string>

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

const store = createJsonCloudStore<StoreShape>({
  cloudObject: 'home-hero.json',
  parse: (raw) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Partial<StoreShape>
    if (!Array.isArray(row.slides) && !row.sections) {
      return {
        slides: [],
        sections: { whystay: '', news: '' },
      }
    }
    return {
      slides: normalizeSlides(row.slides),
      sections: normalizeSections(row.sections),
    }
  },
  serialize: (value) => value,
  defaultValue: () => ({
    slides: DEFAULT_HOME_SLIDES.map((s) => ({ ...s })),
    sections: { ...DEFAULT_HOME_SECTIONS },
  }),
  emptyValue: () => ({
    slides: [],
    sections: { whystay: '', news: '' },
  }),
  hasContent: (value) =>
    Array.isArray(value.slides) &&
    value.slides.length > 0 &&
    Boolean(value.sections?.whystay || value.sections?.news),
})

export function isHomeSectionKey(value: string): value is HomeSectionKey {
  return SECTION_KEYS.includes(value as HomeSectionKey)
}

export async function listHomeHeroSlides(): Promise<HomeHeroSlide[]> {
  return (await store.load()).slides
}

export async function listHomeSections(): Promise<HomeSections> {
  return (await store.load()).sections
}

export async function getHomeSection(key: HomeSectionKey): Promise<string> {
  return (await store.load()).sections[key]
}

export async function updateHomeHeroSlide(
  index: number,
  patch: { image?: string; alt?: string },
): Promise<HomeHeroSlide[]> {
  if (!Number.isInteger(index) || index < 0 || index >= DEFAULT_HOME_SLIDES.length) {
    throw new Error('Invalid slide index.')
  }
  const current = await store.load()
  const slides = current.slides.map((s) => ({ ...s }))
  if (typeof patch.image === 'string' && patch.image.trim()) {
    slides[index] = { ...slides[index], image: patch.image.trim() }
  }
  if (typeof patch.alt === 'string' && patch.alt.trim()) {
    slides[index] = { ...slides[index], alt: patch.alt.trim() }
  }
  const next = { ...current, slides }
  await store.save(next)
  return next.slides
}

export async function resetHomeHeroSlide(index: number): Promise<HomeHeroSlide[]> {
  if (!Number.isInteger(index) || index < 0 || index >= DEFAULT_HOME_SLIDES.length) {
    throw new Error('Invalid slide index.')
  }
  const current = await store.load()
  const slides = current.slides.map((s) => ({ ...s }))
  slides[index] = { ...DEFAULT_HOME_SLIDES[index] }
  const next = { ...current, slides }
  await store.save(next)
  return next.slides
}

export async function resetAllHomeHeroSlides(): Promise<HomeHeroSlide[]> {
  const current = await store.load()
  const next = {
    ...current,
    slides: DEFAULT_HOME_SLIDES.map((s) => ({ ...s })),
  }
  await store.save(next)
  return next.slides
}

export async function updateHomeSection(
  key: HomeSectionKey,
  image: string,
): Promise<HomeSections> {
  const current = await store.load()
  const next = {
    ...current,
    sections: { ...current.sections, [key]: image.trim() },
  }
  await store.save(next)
  return next.sections
}

export async function resetHomeSection(key: HomeSectionKey): Promise<HomeSections> {
  const current = await store.load()
  const next = {
    ...current,
    sections: { ...current.sections, [key]: DEFAULT_HOME_SECTIONS[key] },
  }
  await store.save(next)
  return next.sections
}
