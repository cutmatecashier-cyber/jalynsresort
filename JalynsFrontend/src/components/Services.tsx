import {
  ArrowRightIcon,
  BedIcon,
  DiveIcon,
  LotusIcon,
  UtensilsIcon,
} from "./Icons";
import { Reveal } from "./Reveal";

const services = [
  {
    id: "rooms",
    title: "Rooms and Apartments",
    description: "Comfortable rooms with sea or garden views for restful nights.",
    href: "#rooms",
    cta: "View Rooms",
    image:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=80",
    icon: BedIcon,
  },
  {
    id: "restaurant",
    title: "Restaurant",
    description: "Fresh seafood and Filipino favorites by Mangrove Cove.",
    href: "#restaurant",
    cta: "View Menu",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=80",
    icon: UtensilsIcon,
  },
  {
    id: "diving",
    title: "Scuba Diving",
    description: "PADI guides and gear for Puerto Galera’s best reefs.",
    href: "#diving",
    cta: "Explore Scuba Diving",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80",
    icon: DiveIcon,
  },
  {
    id: "spa",
    title: "SPA",
    description: "Massage and quiet spaces for slow mornings by the water.",
    href: "#spa",
    cta: "Learn More",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80",
    icon: LotusIcon,
  },
] as const;

export function Services() {
  return (
    <section className="bg-white px-4 py-10 sm:px-5 sm:py-14 md:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <Reveal key={service.id} delay={index * 90} variant="up">
              <article
                id={service.id === "rooms" ? undefined : service.id}
                className="group overflow-hidden rounded-2xl border border-ink/6 bg-white shadow-[0_8px_24px_rgba(12,18,16,0.05)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(12,18,16,0.1)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span
                    className="absolute bottom-0 left-3 flex h-9 w-9 translate-y-1/2 items-center justify-center rounded-full bg-ink text-white shadow-md transition group-hover:scale-105 animate-float"
                    style={{ animationDelay: `${index * 0.4}s` }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="px-3 pt-6 pb-4 sm:px-4 sm:pb-5">
                  <h2 className="font-display text-base leading-tight text-ink sm:text-xl">
                    {service.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-[0.72rem] leading-relaxed text-stone sm:text-[0.8rem]">
                    {service.description}
                  </p>
                  <a
                    href={service.href}
                    className="mt-2.5 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-ink transition group-hover:gap-2 sm:mt-3 sm:text-[0.8rem]"
                  >
                    {service.cta}
                    <ArrowRightIcon className="h-3 w-3" />
                  </a>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
