import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  createSpaCategory,
  createSpaService,
  deleteSpaCategory,
  deleteSpaService,
  fetchSpaCategories,
  notifySpaUpdated,
  spaMediaUrl,
  updateSpaCategory,
  updateSpaService,
  uploadSpaImage,
  type SpaCategory,
  type SpaService,
} from "../lib/spa";
import { broadcastContentChanged } from "./ContentSync";
import { Reveal } from "./Reveal";

const inputClass =
  "mt-1 w-full rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

type Props = {
  canEdit: boolean;
};

export function SpaTreatmentsSection({ canEdit }: Props) {
  const [categories, setCategories] = useState<SpaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [catModal, setCatModal] = useState<"create" | SpaCategory | null>(null);
  const [svcModal, setSvcModal] = useState<"create" | SpaService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "category"; category: SpaCategory }
    | { type: "service"; service: SpaService }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [catLabel, setCatLabel] = useState("");
  const [catNote, setCatNote] = useState("");
  const [catImage, setCatImage] = useState("");
  const [catPreview, setCatPreview] = useState<string | null>(null);
  const [catFile, setCatFile] = useState<File | null>(null);
  const catFileRef = useRef<HTMLInputElement>(null);

  const [svcName, setSvcName] = useState("");
  const [svcMins, setSvcMins] = useState("");
  const [svcRate, setSvcRate] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSpaCategories();
      setCategories(list);
      setActiveId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
      notifySpaUpdated(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load spa treatments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const current = categories.find((c) => c.id === activeId) ?? categories[0] ?? null;

  function openCreateCategory() {
    setModalError(null);
    setCatLabel("");
    setCatNote("");
    setCatImage("");
    setCatPreview(null);
    setCatFile(null);
    setCatModal("create");
  }

  function openEditCategory(cat: SpaCategory) {
    setModalError(null);
    setCatLabel(cat.label);
    setCatNote(cat.note ?? "");
    setCatImage(cat.image_url ?? "");
    setCatPreview(cat.image_url ? spaMediaUrl(cat.image_url) : null);
    setCatFile(null);
    setCatModal(cat);
  }

  function openCreateService() {
    if (!current) return;
    setModalError(null);
    setSvcName("");
    setSvcMins("");
    setSvcRate("");
    setSvcModal("create");
  }

  function openEditService(svc: SpaService) {
    setModalError(null);
    setSvcName(svc.name);
    setSvcMins(svc.mins != null ? String(svc.mins) : "");
    setSvcRate(svc.rate);
    setSvcModal(svc);
  }

  function onPickImage(file: File | null) {
    setCatFile(file);
    if (!file) {
      setCatPreview(catImage ? spaMediaUrl(catImage) : null);
      return;
    }
    setCatPreview(URL.createObjectURL(file));
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      let image_url = catImage.trim() || null;
      if (catFile) {
        image_url = await uploadSpaImage(catFile);
      }
      if (catModal === "create") {
        await createSpaCategory({
          label: catLabel.trim(),
          note: catNote.trim() || null,
          image_url,
          sort_order: categories.length + 1,
        });
      } else if (catModal) {
        await updateSpaCategory(catModal.id, {
          label: catLabel.trim(),
          note: catNote.trim() || null,
          image_url,
          sort_order: catModal.sort_order,
        });
      }
      setCatModal(null);
      broadcastContentChanged();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not save category.");
    } finally {
      setSaving(false);
    }
  }

  async function saveService(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    setSaving(true);
    setModalError(null);
    try {
      const minsRaw = svcMins.trim();
      const mins = minsRaw === "" ? null : Number(minsRaw);
      if (svcModal === "create") {
        await createSpaService({
          category_id: current.id,
          name: svcName.trim(),
          mins,
          rate: svcRate.trim(),
          sort_order: current.services.length + 1,
        });
      } else if (svcModal) {
        await updateSpaService(svcModal.id, {
          category_id: current.id,
          name: svcName.trim(),
          mins,
          rate: svcRate.trim(),
          sort_order: svcModal.sort_order,
        });
      }
      setSvcModal(null);
      broadcastContentChanged();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not save service.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setModalError(null);
    try {
      if (deleteTarget.type === "category") {
        await deleteSpaCategory(deleteTarget.category.id);
      } else {
        await deleteSpaService(deleteTarget.service.id);
      }
      setDeleteTarget(null);
      broadcastContentChanged();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Reveal variant="up">
        <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
          <div className="border-b border-ink/8 px-4 pt-4 pb-3.5 sm:px-5 sm:pt-5 sm:pb-4 lg:px-6">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0">
                <h2 className="font-display text-xl text-ink sm:text-2xl">
                  Treatments &amp; prices
                </h2>
                <p className="mt-1 max-w-2xl text-[0.8125rem] leading-relaxed text-stone sm:text-sm">
                  Rates in Philippine pesos. Speak with reception to book a session at our partner
                  Spa Center
                  {canEdit ? " — add, edit, or remove services and pictures." : "."}
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={openCreateCategory}
                  className="btn-press rounded-full bg-sky-deep px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky"
                >
                  Add category
                </button>
              ) : null}
            </div>

            {loading ? (
              <p className="mt-3.5 text-sm text-stone">Loading treatments…</p>
            ) : error ? (
              <p className="mt-3.5 text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : categories.length === 0 ? (
              <p className="mt-3.5 text-sm text-stone">
                No spa categories yet
                {canEdit ? " — click Add category to start." : "."}
              </p>
            ) : (
              <div
                className="mt-3.5 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Spa categories"
              >
                {categories.map((cat) => {
                  const selected = cat.id === current?.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveId(cat.id)}
                      className={`btn-press shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-[0.8125rem] ${
                        selected
                          ? "bg-ink text-white"
                          : "bg-mist text-ink/75 hover:bg-ink/10 hover:text-ink"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {current ? (
            <div
              key={current.id}
              className="grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]"
            >
              <div className="relative hidden min-h-[14rem] overflow-hidden lg:block xl:min-h-[16rem]">
                {current.image_url ? (
                  <img
                    src={spaMediaUrl(current.image_url)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-mist" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 xl:p-5">
                  <p className="font-display text-2xl text-white xl:text-[1.65rem]">
                    {current.label}
                  </p>
                  {current.note ? (
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{current.note}</p>
                  ) : (
                    <p className="mt-1 text-[0.65rem] font-medium tracking-[0.18em] text-white/60 uppercase">
                      {current.services.length} services
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 py-1.5 sm:px-5 lg:px-6 lg:py-2">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/8 py-2.5">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl text-ink lg:hidden">{current.label}</h3>
                    {current.note ? (
                      <p className="mt-0.5 text-xs text-stone lg:hidden">{current.note}</p>
                    ) : null}
                    {canEdit ? (
                      <p className="hidden text-xs text-stone lg:block">
                        Manage services in this category
                      </p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={openCreateService}
                        className="btn-press rounded-full bg-sky-deep px-3 py-1 text-[0.7rem] font-semibold text-white transition hover:bg-sky"
                      >
                        Add service
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCategory(current)}
                        className="btn-press rounded-full border border-ink/15 bg-white px-3 py-1 text-[0.7rem] font-semibold text-ink transition hover:border-ink/30"
                      >
                        Edit category
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: "category", category: current })}
                        className="btn-press rounded-full border border-red-200 bg-white px-3 py-1 text-[0.7rem] font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {current.services.length === 0 ? (
                  <p className="py-5 text-sm text-stone">
                    No services yet
                    {canEdit ? " — click Add service." : "."}
                  </p>
                ) : (
                  <ul className="divide-y divide-ink/8">
                    {current.services.map((row) => (
                      <li
                        key={row.id}
                        className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 py-2.5 sm:gap-x-6"
                      >
                        <div className="min-w-0">
                          <p className="text-[0.84rem] font-semibold leading-snug text-ink sm:text-[0.9rem]">
                            {row.name}
                          </p>
                          {row.mins ? (
                            <p className="mt-0.5 text-[0.65rem] font-medium tracking-[0.12em] text-stone uppercase">
                              {row.mins} min
                            </p>
                          ) : null}
                          {canEdit ? (
                            <div className="mt-1 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openEditService(row)}
                                className="text-[0.7rem] font-semibold text-sky-deep hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: "service", service: row })}
                                className="text-[0.7rem] font-semibold text-red-700 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <p className="text-[0.9rem] font-semibold tabular-nums text-ink sm:text-[0.95rem]">
                          {row.rate}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </Reveal>

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
                onSubmit={(e) => void saveCategory(e)}
                className="flex max-h-[min(88dvh,34rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
                  <h3 className="font-display text-lg text-ink">
                    {catModal === "create" ? "Add category" : "Edit category"}
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <label className="text-xs font-semibold text-ink" htmlFor="spa-cat-label">
                        Name
                      </label>
                      <input
                        id="spa-cat-label"
                        className={inputClass}
                        value={catLabel}
                        onChange={(e) => setCatLabel(e.target.value)}
                        required
                        minLength={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink" htmlFor="spa-cat-note">
                        Note (optional)
                      </label>
                      <input
                        id="spa-cat-note"
                        className={inputClass}
                        value={catNote}
                        onChange={(e) => setCatNote(e.target.value)}
                        placeholder="Short description"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink">Picture</p>
                      {catPreview ? (
                        <img
                          src={catPreview}
                          alt=""
                          className="mt-1.5 h-28 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="mt-1.5 flex h-28 items-center justify-center rounded-lg bg-mist text-xs text-stone">
                          No image yet
                        </div>
                      )}
                      <input
                        ref={catFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                      />
                      <button
                        type="button"
                        onClick={() => catFileRef.current?.click()}
                        className="btn-press mt-1.5 rounded-full border border-ink/15 px-3 py-1 text-[0.7rem] font-semibold text-ink"
                      >
                        {catPreview ? "Change picture" : "Upload picture"}
                      </button>
                    </div>
                  </div>
                  {modalError ? (
                    <p className="mt-2 text-sm font-medium text-red-700">{modalError}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-ink/8 bg-white px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setCatModal(null)}
                    className="btn-press rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-press rounded-full bg-sky-deep px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}

      {svcModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-label={svcModal === "create" ? "Add service" : "Edit service"}
              onClick={() => !saving && setSvcModal(null)}
            >
              <form
                onSubmit={(e) => void saveService(e)}
                className="flex max-h-[min(88dvh,30rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
                  <h3 className="font-display text-lg text-ink">
                    {svcModal === "create" ? "Add service" : "Edit service"}
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <label className="text-xs font-semibold text-ink" htmlFor="spa-svc-name">
                        Name
                      </label>
                      <input
                        id="spa-svc-name"
                        className={inputClass}
                        value={svcName}
                        onChange={(e) => setSvcName(e.target.value)}
                        required
                        minLength={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink" htmlFor="spa-svc-mins">
                        Duration (minutes, optional)
                      </label>
                      <input
                        id="spa-svc-mins"
                        type="number"
                        min={0}
                        className={inputClass}
                        value={svcMins}
                        onChange={(e) => setSvcMins(e.target.value)}
                        placeholder="e.g. 60"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink" htmlFor="spa-svc-rate">
                        Rate
                      </label>
                      <input
                        id="spa-svc-rate"
                        className={inputClass}
                        value={svcRate}
                        onChange={(e) => setSvcRate(e.target.value)}
                        required
                        placeholder="e.g. ₱500"
                      />
                    </div>
                  </div>
                  {modalError ? (
                    <p className="mt-2 text-sm font-medium text-red-700">{modalError}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-ink/8 bg-white px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setSvcModal(null)}
                    className="btn-press rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-press rounded-full bg-sky-deep px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
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
                className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-display text-xl text-ink">
                  Delete{" "}
                  {deleteTarget.type === "category"
                    ? deleteTarget.category.label
                    : deleteTarget.service.name}
                  ?
                </h3>
                <p className="mt-2 text-sm text-stone">
                  {deleteTarget.type === "category"
                    ? "This also deletes all services in the category."
                    : "This service will be removed from the SPA list."}
                </p>
                {modalError ? (
                  <p className="mt-3 text-sm font-medium text-red-700">{modalError}</p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void confirmDelete()}
                    className="btn-press rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
