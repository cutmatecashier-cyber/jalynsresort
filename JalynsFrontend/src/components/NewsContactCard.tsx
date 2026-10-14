import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DEFAULT_CONTACT_SETTINGS,
  fetchContactSettings,
  subscribeContactBackgrounds,
} from "../lib/contact";
import { formatPhMobileForDisplay, telHref } from "../lib/resortLocation";

export function NewsContactCard() {
  const [contact, setContact] = useState(DEFAULT_CONTACT_SETTINGS);

  useEffect(() => {
    let active = true;
    async function load() {
      const next = await fetchContactSettings();
      if (active) setContact(next);
    }
    void load();
    const unsubscribe = subscribeContactBackgrounds(() => {
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const address = contact.address.trim();
  const mapsUrl = contact.maps_url.trim();
  const phone = contact.phone.trim();

  return (
    <div className="rounded-xl bg-[#0c1412] p-4 text-white">
      <h2 className="font-display text-lg">Contact Us</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-white/70">
        Jalyn&apos;s Resort
        {address ? (
          <>
            <br />
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                {address}
              </a>
            ) : (
              address
            )}
          </>
        ) : null}
      </p>
      {phone ? (
        <p className="mt-2 text-sm text-white/80">
          <a href={telHref(phone)} className="transition hover:text-white">
            Smart: {formatPhMobileForDisplay(phone)}
          </a>
        </p>
      ) : null}
      <Link
        to="/contact"
        className="btn-press mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/92"
      >
        Message us
      </Link>
    </div>
  );
}
