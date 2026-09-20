import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { getApiUrl, resolveMediaUrl } from "../lib/api";
import { optimizeImageFile } from "../lib/scuba";
import { supabase } from "../lib/supabase";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { Reveal } from "./Reveal";

const DESKTOP_DISH_PER_PAGE = 8; // 2 rows × 4 columns
const DESKTOP_DISH_COLS = 4;

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number | null;
  image_url: string | null;
  sort_order: number;
  available: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
};

/** Resolve relative upload paths against the API host (works on phone LAN). */
function mediaUrl(url: string | null | undefined) {
  return resolveMediaUrl(url);
}

function DishThumb({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`bg-mist ${className ?? ""}`} aria-hidden />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

const MENU_IMAGE_BUCKET = "restaurant-page";

async function freshAccessToken(): Promise<string> {
  const current = await supabase.auth.getSession();
  let token = current.data.session?.access_token ?? null;
  const expiresAt = current.data.session?.expires_at;
  const nearlyExpired =
    typeof expiresAt === "number" && expiresAt * 1000 < Date.now() + 90_000;

  if (!token || nearlyExpired) {
    const refreshed = await supabase.auth.refreshSession();
    token = refreshed.data.session?.access_token ?? token;
  }

  if (!token) {
    throw new Error("Admin session expired. Please sign in again, then retry the upload.");
  }
  return token;
}

async function authHeaders(json = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await freshAccessToken()}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function menuImageExt(file: File) {
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

/** Upload to Supabase Storage from the browser (avoids Vite proxy 401 on multipart). */
async function uploadMenuImageToSupabase(file: File): Promise<string> {
  // Touch session so supabase-js uses a fresh JWT for Storage RLS.
  await freshAccessToken();
  const objectPath = `menu/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${menuImageExt(file)}`;
  const { error } = await supabase.storage.from(MENU_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) {
    const msg = error.message || "";
    if (/bucket|not found|404|row-level security|policy/i.test(msg)) {
      throw new Error(
        "Restaurant image storage is not set up or you are not an approved admin. Run supabase/RESTAURANT_PAGE.sql in Supabase, sign out/in, then retry.",
      );
    }
    throw new Error(msg || "Could not upload image to cloud storage.");
  }
  const { data } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(objectPath);
  return `${data.publicUrl}${data.publicUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

type Props = {
  canEdit: boolean;
  cardClass: string;
};

export function RestaurantMenuSection({ canEdit, cardClass }: Props) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [catModal, setCatModal] = useState<"create" | MenuCategory | null>(null);
  const [itemModal, setItemModal] = useState<"create" | MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "category"; category: MenuCategory }
    | { type: "item"; item: MenuItem }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [catName, setCatName] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [itemPreview, setItemPreview] = useState<string | null>(null);
  const [itemFile, setItemFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [itemAvailable, setItemAvailable] = useState(true);
  const [dishPage, setDishPage] = useState(0);

  async function loadMenu() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/menu`);
      const body = (await res.json()) as {
        success?: boolean;
        message?: string;
        categories?: MenuCategory[];
      };
      if (!res.ok) {
        setError(body.message ?? "Could not load menu.");
        return;
      }
      const list = (Array.isArray(body.categories) ? body.categories : [])
        .map((c) => ({
          ...c,
          items: [...(c.items ?? [])].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
          ),
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
      setCategories(list);
      setActiveId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMenu();
  }, []);

  useEffect(() => {
    setDishPage(0);
  }, [activeId]);

  useEffect(() => {
    if (!lightbox && !catModal && !itemModal && !deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setLightbox(null);
      if (!saving && !deleting) {
        setCatModal(null);
        setItemModal(null);
        setDeleteTarget(null);
      }
    };
    document.body.style.overflow = "hidden";
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    lenis?.stop();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, catModal, itemModal, deleteTarget, saving, deleting]);

  const active = categories.find((c) => c.id === activeId) ?? null;

  const dishPageCount = useMemo(() => {
    const total = active?.items.length ?? 0;
    return Math.max(1, Math.ceil(total / DESKTOP_DISH_PER_PAGE));
  }, [active?.items.length]);

  useEffect(() => {
    setDishPage((p) => Math.min(p, Math.max(0, dishPageCount - 1)));
  }, [dishPageCount]);

  const safeDishPage = Math.min(dishPage, dishPageCount - 1);

  const desktopDishPage = useMemo(() => {
    const items = active?.items ?? [];
    const start = safeDishPage * DESKTOP_DISH_PER_PAGE;
    return items.slice(start, start + DESKTOP_DISH_PER_PAGE);
  }, [active?.items, safeDishPage]);

  const showDishPager = (active?.items.length ?? 0) > DESKTOP_DISH_PER_PAGE;
  const dishCounterStart =
    (active?.items.length ?? 0) > 0 ? safeDishPage * DESKTOP_DISH_PER_PAGE + 1 : 0;
  const dishCounterEnd = Math.min(
    safeDishPage * DESKTOP_DISH_PER_PAGE + DESKTOP_DISH_PER_PAGE,
    active?.items.length ?? 0,
  );

  function openCreateCategory() {
    setCatName("");
    setModalError(null);
    setCatModal("create");
  }

  function openEditCategory(cat: MenuCategory) {
    setCatName(cat.name);
    setModalError(null);
    setCatModal(cat);
  }

  function openCreateItem() {
    if (!active) return;
    setItemName("");
    setItemDesc("");
    setItemImage("");
    setItemPreview(null);
    setItemFile(null);
    setItemAvailable(true);
    setModalError(null);
    setItemModal("create");
  }

  function openEditItem(item: MenuItem) {
    setItemName(item.name);
    setItemDesc(item.description);
    setItemImage(item.image_url ?? "");
    setItemPreview(mediaUrl(item.image_url));
    setItemFile(null);
    setItemAvailable(item.available);
    setModalError(null);
    setItemModal(item);
  }

  function onPickDishImage(file: File | null) {
    setItemFile(file);
    if (!file) {
      setItemPreview(mediaUrl(itemImage) || null);
      return;
    }
    const local = URL.createObjectURL(file);
    setItemPreview(local);
  }

  async function uploadMenuImage(file: File): Promise<string> {
    // Dish cards are small — compress aggressively so phone photos upload fast.
    const optimized = await optimizeImageFile(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.78,
      maxBytes: 450_000,
      strict: true,
    });

    // Prefer direct Supabase upload — multipart through the Vite proxy often returns 401.
    try {
      return await uploadMenuImageToSupabase(optimized);
    } catch (cloudErr) {
      console.warn("[menu upload] Supabase client upload failed, trying API:", cloudErr);
    }

    const post = async () => {
      const token = await freshAccessToken();
      const body = new FormData();
      // Token in the body survives proxies that drop Authorization on multipart.
      body.append("access_token", token);
      body.append("image", optimized);
      return fetch(`${getApiUrl()}/api/menu/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
    };

    let res = await post();
    if (res.status === 401) {
      await supabase.auth.refreshSession();
      res = await post();
    }

    const data = (await res.json().catch(() => ({}))) as { message?: string; url?: string };
    if (!res.ok || !data.url) {
      if (res.status === 401) {
        throw new Error(
          data.message ?? "Session expired. Sign out, sign in again, then upload the picture.",
        );
      }
      throw new Error(data.message ?? "Could not upload image.");
    }
    return data.url;
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      const headers = await authHeaders();
      const payload = {
        name: catName.trim(),
        sort_order:
          catModal !== "create" && catModal
            ? catModal.sort_order
            : (categories.length + 1) * 10,
      };
      const isEdit = catModal !== "create" && catModal !== null;
      const res = await fetch(
        isEdit ? `${getApiUrl()}/api/menu/categories/${catModal.id}` : `${getApiUrl()}/api/menu/categories`,
        {
          method: isEdit ? "PUT" : "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setModalError(body.message ?? "Could not save category.");
        return;
      }
      setCatModal(null);
      await loadMenu();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not save category.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(cat: MenuCategory) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${getApiUrl()}/api/menu/categories/${cat.id}`, {
        method: "DELETE",
        headers,
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? "Could not delete category.");
        return false;
      }
      await loadMenu();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category.");
      return false;
    }
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    setSaving(true);
    setModalError(null);
    try {
      let image_url = itemImage.trim();
      if (itemFile) {
        setUploadingImage(true);
        image_url = await uploadMenuImage(itemFile);
        setItemImage(image_url);
        setItemFile(null);
      }

      const headers = await authHeaders();
      const payload = {
        category_id: active.id,
        name: itemName.trim(),
        description: itemDesc.trim(),
        price: null,
        image_url,
        sort_order:
          itemModal !== "create" && itemModal
            ? itemModal.sort_order
            : (active.items.length + 1) * 10,
        available: itemAvailable,
      };
      const isEdit = itemModal !== "create" && itemModal !== null;
      const res = await fetch(
        isEdit ? `${getApiUrl()}/api/menu/items/${itemModal.id}` : `${getApiUrl()}/api/menu/items`,
        {
          method: isEdit ? "PUT" : "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setModalError(body.message ?? "Could not save dish.");
        return;
      }
      setItemModal(null);
      await loadMenu();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not save dish.");
    } finally {
      setUploadingImage(false);
      setSaving(false);
    }
  }

  async function removeItem(item: MenuItem) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${getApiUrl()}/api/menu/items/${item.id}`, {
        method: "DELETE",
        headers,
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? "Could not delete dish.");
        return false;
      }
      await loadMenu();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete dish.");
      return false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const ok =
        deleteTarget.type === "category"
          ? await removeCategory(deleteTarget.category)
          : await removeItem(deleteTarget.item);
      if (ok) setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className={`mt-8 sm:mt-10 ${cardClass}`}>
      <Reveal delay={40} variant="up">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/8 pb-5 sm:pb-6">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.26em] text-sky-deep uppercase">
              From the kitchen
            </p>
            <h2 className="font-display mt-1.5 text-2xl tracking-tight text-ink sm:text-3xl">
              Restaurant Menu
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-ink/70">
              Browse by category
              {canEdit ? " — add, edit, or remove dishes as needed." : "."}
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={openCreateCategory}
              className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky"
            >
              Add category
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-ink/70">Loading menu…</p>
        ) : error ? (
          <p className="mt-6 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : categories.length === 0 ? (
          <p className="mt-6 text-sm text-ink/70">
            No menu categories yet
            {canEdit ? " — click Add category to start." : "."}
          </p>
        ) : (
          <>
            {/* Mobile category tabs */}
            <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((cat) => {
                const selected = cat.id === activeId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveId(cat.id)}
                    className={`btn-press shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? "bg-sky-deep text-white shadow-[0_4px_14px_rgba(3,105,161,0.25)]"
                        : "border border-ink/10 bg-white/90 text-ink/65 hover:border-ink/20 hover:text-ink"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {canEdit && active ? (
              <div className="mt-5 mb-3 flex flex-wrap items-center justify-center gap-2 md:mt-6 md:justify-end">
                <button
                  type="button"
                  onClick={openCreateItem}
                  className="btn-press rounded-full bg-sky-deep px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky"
                >
                  Add dish
                </button>
                <button
                  type="button"
                  onClick={() => openEditCategory(active)}
                  className="btn-press rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/30"
                >
                  Edit category
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: "category", category: active })}
                  className="btn-press rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            ) : null}

            <div
              className={`md:grid md:grid-cols-[11.5rem_minmax(0,1fr)] md:items-stretch md:gap-0 lg:grid-cols-[12.5rem_minmax(0,1fr)] ${
                canEdit && active ? "" : "mt-5 md:mt-6"
              }`}
            >
              {/* Desktop — categories rail (same height as 2×4 dish grid) */}
              <aside className="hidden min-h-0 md:flex md:pr-5 lg:pr-6">
                <div className="flex h-full min-h-[22rem] w-full flex-col rounded-2xl bg-mist/70 p-2.5 ring-1 ring-ink/6">
                  <p className="shrink-0 px-2 pt-0.5 text-[0.58rem] font-semibold tracking-[0.2em] text-ink/70 uppercase">
                    Categories
                  </p>
                  <nav
                    className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5"
                    aria-label="Menu categories"
                  >
                    {categories.map((cat) => {
                      const selected = cat.id === activeId;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveId(cat.id)}
                          className={`min-h-0 flex-1 rounded-lg px-2.5 py-1.5 text-left text-[0.78rem] leading-snug transition ${
                            selected
                              ? "bg-sky-deep font-semibold text-white shadow-[0_4px_12px_rgba(3,105,161,0.28)]"
                              : "font-medium text-ink/65 hover:bg-white/80 hover:text-ink"
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              {active ? (
              <div className="flex min-h-0 min-w-0 flex-col md:min-h-[22rem] md:border-l md:border-ink/8 md:pl-5 lg:pl-6">
                <div className="flex min-h-0 flex-1 flex-col">
                  {active.items.length === 0 ? (
                    <p className="text-sm text-ink/70">
                      No dishes in this category yet
                      {canEdit ? " — click Add dish." : "."}
                    </p>
                  ) : active.items.some((i) => i.image_url) ? (
                    <>
                      {/* Mobile — compact list */}
                      <ul className="flex flex-col gap-3 md:hidden">
                        {active.items.map((item, index) => (
                          <Reveal
                            key={`m-${item.id}`}
                            delay={index * 50}
                            variant="up"
                            className="w-full"
                          >
                            <li
                              className={`card-lift flex gap-3 overflow-hidden rounded-2xl border border-ink/8 bg-white p-2.5 shadow-[0_4px_14px_rgba(12,18,16,0.05)] ${
                                item.available ? "" : "opacity-55"
                              }`}
                            >
                              {item.image_url ? (
                                <button
                                  type="button"
                                  className="h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-mist"
                                  onClick={() => setLightbox(mediaUrl(item.image_url)!)}
                                  aria-label={`View ${item.name}`}
                                >
                                  <DishThumb
                                    src={mediaUrl(item.image_url)!}
                                    alt={item.name}
                                    className="h-full w-full object-cover object-center"
                                  />
                                </button>
                              ) : (
                                <div className="h-[5.5rem] w-[5.5rem] shrink-0 rounded-xl bg-mist" />
                              )}
                              <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
                                <p className="min-w-0 font-semibold leading-snug text-ink">
                                  {item.name}
                                </p>
                                {!item.available ? (
                                  <p className="mt-0.5 text-[0.6rem] font-semibold tracking-wide text-ink/55 uppercase">
                                    Unavailable
                                  </p>
                                ) : null}
                                {item.description ? (
                                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink/70">
                                    {item.description}
                                  </p>
                                ) : null}
                                {canEdit ? (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditItem(item)}
                                      className="rounded-full border border-ink/12 px-2.5 py-1 text-[0.7rem] font-semibold text-ink"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget({ type: "item", item })}
                                      className="rounded-full border border-red-200 px-2.5 py-1 text-[0.7rem] font-semibold text-red-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          </Reveal>
                        ))}
                      </ul>

                      {/* Desktop — up to 4 cols, only filled dishes (no empty placeholders) */}
                      <div className="hidden min-h-0 flex-1 flex-col md:flex">
                        <ul
                          className="grid min-h-0 flex-1 auto-rows-fr gap-2.5 lg:gap-3"
                          style={{
                            gridTemplateColumns: `repeat(${DESKTOP_DISH_COLS}, minmax(0, 1fr))`,
                          }}
                        >
                          {desktopDishPage.map((item) => (
                              <li
                                key={item.id}
                                className={`group flex min-h-0 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[0_3px_10px_rgba(8,18,28,0.06)] ${
                                  item.available ? "" : "opacity-55"
                                }`}
                              >
                                {item.image_url ? (
                                  <button
                                    type="button"
                                    className="relative isolate block h-[58%] min-h-[4.5rem] w-full shrink-0 overflow-hidden bg-mist"
                                    onClick={() => setLightbox(mediaUrl(item.image_url)!)}
                                    aria-label={`View ${item.name}`}
                                  >
                                    <DishThumb
                                      src={mediaUrl(item.image_url)!}
                                      alt={item.name}
                                      className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 ease-out group-hover:scale-[1.03]"
                                    />
                                  </button>
                                ) : (
                                  <div className="h-[58%] min-h-[4.5rem] w-full shrink-0 bg-mist" />
                                )}

                                <div className="flex min-h-0 flex-1 flex-col px-2 py-1.5">
                                  <h4 className="truncate font-display text-[0.82rem] leading-snug text-ink">
                                    {item.name}
                                  </h4>

                                  {!item.available ? (
                                    <p className="text-[0.5rem] font-semibold tracking-[0.1em] text-ink/55 uppercase">
                                      Unavailable
                                    </p>
                                  ) : null}

                                  {item.description ? (
                                    <p className="mt-0.5 line-clamp-1 text-[0.68rem] leading-snug text-ink/65">
                                      {item.description}
                                    </p>
                                  ) : null}

                                  {canEdit ? (
                                    <div className="mt-auto flex flex-wrap gap-1 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => openEditItem(item)}
                                        className="rounded-full border border-ink/12 bg-white px-1.5 py-0.5 text-[0.6rem] font-semibold text-ink transition hover:bg-mist"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTarget({ type: "item", item })}
                                        className="rounded-full border border-red-200 bg-white px-1.5 py-0.5 text-[0.6rem] font-semibold text-red-700 transition hover:bg-red-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </li>
                          ))}
                        </ul>

                        {showDishPager ? (
                          <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setDishPage((p) => Math.max(0, p - 1))}
                              disabled={safeDishPage <= 0}
                              aria-label="Previous dishes"
                              className="btn-press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ChevronLeftIcon className="h-4 w-4" />
                            </button>
                            <p className="min-w-[4.5rem] text-center text-xs font-semibold tracking-wide text-ink tabular-nums">
                              {dishCounterStart}–{dishCounterEnd} / {active?.items.length ?? 0}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setDishPage((p) => Math.min(dishPageCount - 1, p + 1))
                              }
                              disabled={safeDishPage >= dishPageCount - 1}
                              aria-label="Next dishes"
                              className="btn-press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ChevronRightIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <ul className="divide-y divide-ink/8 rounded-xl border border-ink/8 bg-foam/70">
                      {active.items.map((item) => (
                        <li
                          key={item.id}
                          className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5 ${
                            item.available ? "" : "opacity-55"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <p className="font-semibold text-ink">{item.name}</p>
                              {!item.available ? (
                                <span className="text-[0.65rem] font-semibold tracking-wide text-ink/55 uppercase">
                                  Unavailable
                                </span>
                              ) : null}
                            </div>
                            {item.description ? (
                              <p className="mt-1 text-sm leading-relaxed text-ink/70">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                          {canEdit ? (
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => openEditItem(item)}
                                className="btn-press rounded-full border border-ink/12 px-3 py-1 text-xs font-semibold text-ink transition hover:border-ink/25"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: "item", item })}
                                className="btn-press rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
            </div>
          </>
        )}
      </Reveal>
      </section>

      {lightbox
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Menu image"
              onClick={() => setLightbox(null)}
            >
              {/*
                Do NOT use .btn-press here — it sets position:relative and overrides
                fixed/absolute, which hid the close control on mobile.
              */}
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-black/80 text-2xl leading-none font-semibold text-white shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
                style={{
                  position: "fixed",
                  top: "max(0.85rem, env(safe-area-inset-top))",
                  right: "max(0.85rem, env(safe-area-inset-right))",
                  zIndex: 210,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(null);
                }}
                aria-label="Close image"
              >
                ×
              </button>

              <img
                src={lightbox}
                alt=""
                className="max-h-[min(58svh,420px)] max-w-[min(82vw,420px)] rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}

      {catModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label={catModal === "create" ? "Add category" : "Edit category"}
              onClick={() => !saving && setCatModal(null)}
            >
              <form
                onSubmit={saveCategory}
                className="flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
                  <h3 className="font-display text-xl text-ink">
                    {catModal === "create" ? "Add category" : "Edit category"}
                  </h3>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-ink" htmlFor="cat-name">
                        Name
                      </label>
                      <input
                        id="cat-name"
                        className={inputClass}
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        required
                        minLength={2}
                      />
                    </div>
                  </div>
                  {modalError ? (
                    <p className="mt-3 text-sm font-medium text-red-700">{modalError}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-ink/8 bg-white px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setCatModal(null)}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}

      {itemModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label={itemModal === "create" ? "Add dish" : "Edit dish"}
              onClick={() => !saving && setItemModal(null)}
            >
              <form
                onSubmit={saveItem}
                className="flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-h-[min(90dvh,42rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
                  <h3 className="font-display text-xl text-ink">
                    {itemModal === "create" ? "Add dish" : "Edit dish"}
                  </h3>
                  <p className="mt-1 text-xs text-ink/70">Category: {active?.name}</p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-ink" htmlFor="item-name">
                        Name
                      </label>
                      <input
                        id="item-name"
                        className={inputClass}
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        required
                        minLength={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-ink" htmlFor="item-desc">
                        Description
                      </label>
                      <textarea
                        id="item-desc"
                        className={`${inputClass} resize-y`}
                        rows={3}
                        value={itemDesc}
                        onChange={(e) => setItemDesc(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-ink" htmlFor="item-image">
                        Dish photo
                      </label>
                      <div className="mt-1.5 space-y-3">
                        {itemPreview ? (
                          <img
                            src={itemPreview}
                            alt=""
                            className="max-h-40 w-full rounded-xl border border-ink/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-ink/15 bg-mist/60 text-sm text-ink/70">
                            No photo yet
                          </div>
                        )}
                        <input
                          id="item-image"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-full file:border-0 file:bg-sky-deep file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky"
                          onChange={(e) => onPickDishImage(e.target.files?.[0] ?? null)}
                        />
                        <p className="text-xs text-ink/70">
                          JPG, PNG, or WEBP — photos are compressed automatically for faster upload.
                        </p>
                        {itemImage || itemFile ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700 underline"
                            onClick={() => {
                              setItemFile(null);
                              setItemImage("");
                              setItemPreview(null);
                            }}
                          >
                            Remove photo
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={itemAvailable}
                        onChange={(e) => setItemAvailable(e.target.checked)}
                        className="rounded border-ink/20"
                      />
                      Available
                    </label>
                  </div>
                  {modalError ? (
                    <p className="mt-3 text-sm font-medium text-red-700">{modalError}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-ink/8 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setItemModal(null)}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-press rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? (uploadingImage ? "Uploading…" : "Saving…") : "Save"}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}

      {deleteTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm delete"
              onClick={() => !deleting && setDeleteTarget(null)}
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-display text-xl text-ink">
                  {deleteTarget.type === "category" ? "Delete category?" : "Delete dish?"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {deleteTarget.type === "category" ? (
                    <>
                      Delete{" "}
                      <strong className="font-semibold text-ink">
                        {deleteTarget.category.name}
                      </strong>{" "}
                      and all its dishes? This cannot be undone.
                    </>
                  ) : (
                    <>
                      Delete{" "}
                      <strong className="font-semibold text-ink">{deleteTarget.item.name}</strong>?
                      This cannot be undone.
                    </>
                  )}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void confirmDelete()}
                    className="btn-press rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
