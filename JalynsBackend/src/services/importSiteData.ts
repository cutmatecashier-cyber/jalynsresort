import { loadBookingSettings } from './bookingSettings.js'
import { getContentRevision } from './contentRevision.js'
import { listGallery } from './gallery.js'
import { listHomeHeroSlides } from './homeHero.js'
import { listNews } from './news.js'
import { listRoomBookings } from './roomBookings.js'
import { listSiteReviews } from './siteReviews.js'

/** Copy site-data JSON into tables once, after MOVE_JSON_TO_TABLES.sql has been applied. */
export async function importSiteData() {
  const steps: Array<[string, () => Promise<unknown>]> = [
    ['booking settings', loadBookingSettings],
    ['room bookings', listRoomBookings],
    ['home hero', listHomeHeroSlides],
    ['gallery', listGallery],
    ['news', listNews],
    ['content revision', getContentRevision],
    ['reviews', listSiteReviews],
  ]
  for (const [name, run] of steps) {
    try {
      await run()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Site data import (${name}): ${message}`)
    }
  }
}
