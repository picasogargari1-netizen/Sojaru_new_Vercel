import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, Trash2, Plus, X, LogOut, Image as ImageIcon, Type, Sparkles, LayoutTemplate, Grid3x3, Pencil, Check, Package, ClipboardList, Paperclip, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { admin, mediaUrl, apiErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePageMeta } from "@/hooks/usePageMeta";

function HeroManager() {
  const { settings, reloadSettings } = useStore();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const images = settings?.hero_images || [];

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await admin.uploadHero(fd);
      await reloadSettings();
      toast.success("Banner image added");
    } catch (err) { toast.error(apiErr(err, "Upload failed")); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const onDelete = async (id) => {
    setBusy(true);
    try { await admin.deleteHero(id); await reloadSettings(); toast.success("Image removed"); }
    catch (err) { toast.error(apiErr(err)); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-end">
        <span className="font-mono text-sm font-bold">{images.length}/5</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {images.map((img) => (
          <div key={img.id} data-testid={`hero-thumb-${img.id}`} className="group relative overflow-hidden border-2 border-ink">
            <img src={mediaUrl(img.url)} alt={img.alt} className="aspect-[4/3] w-full object-cover" />
            <button onClick={() => onDelete(img.id)} disabled={busy} data-testid={`hero-delete-${img.id}`} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream transition-colors hover:bg-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {images.length < 5 && (
          <button onClick={() => fileRef.current?.click()} disabled={busy} data-testid="hero-upload-btn" className="flex aspect-[4/3] flex-col items-center justify-center gap-2 border-2 border-dashed border-ink bg-softyellow text-ink transition-colors hover:bg-yellow">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            <span className="text-sm font-bold uppercase">Upload</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" data-testid="hero-file-input" />
    </div>
  );
}

function MarqueeManager() {
  const { settings, reloadSettings } = useStore();
  const [texts, setTexts] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setTexts(settings?.marquee_texts || []); }, [settings]);

  const update = (i, v) => setTexts((t) => t.map((x, idx) => (idx === i ? v : x)));
  const remove = (i) => setTexts((t) => t.filter((_, idx) => idx !== i));
  const add = () => setTexts((t) => [...t, ""]);
  const save = async () => {
    setSaving(true);
    try { await admin.updateSettings({ marquee_texts: texts.filter((t) => t.trim()) }); await reloadSettings(); toast.success("Moving text updated"); }
    catch (err) { toast.error(apiErr(err)); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mt-5 space-y-3">
        {texts.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={t} onChange={(e) => update(i, e.target.value)} className="rounded-none border-2 border-ink bg-cream" data-testid={`marquee-input-${i}`} />
            <button onClick={() => remove(i)} data-testid={`marquee-remove-${i}`} className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink hover:bg-destructive hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <Button onClick={add} variant="outline" className="rounded-none border-2 border-ink" data-testid="marquee-add"><Plus className="mr-2 h-4 w-4" /> Add line</Button>
        <Button onClick={save} disabled={saving} className="rounded-none bg-ink font-bold uppercase text-cream hover:bg-yellow hover:text-ink" data-testid="marquee-save">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}

function FestiveManager() {
  const { settings, reloadSettings } = useStore();
  const [festive, setFestive] = useState({ title: "", enabled: true });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (settings?.festive) setFestive({
      title: settings.festive.title || "",
      enabled: settings.festive.enabled !== false,
    });
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await admin.updateSettings({ festive: { title: festive.title, enabled: festive.enabled } });
      await reloadSettings();
      toast.success("Festive collection updated");
    } catch (err) { toast.error(apiErr(err)); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <Label>Card title</Label>
        <Input value={festive.title} onChange={(e) => setFestive({ ...festive, title: e.target.value })} placeholder="e.g. Diwali Edit, Holiday Gifting" className="mt-1.5 rounded-none border-2 border-ink bg-cream" data-testid="festive-title-input" />
      </div>
      <label className="flex items-center justify-between border-2 border-ink bg-cream px-4 py-3">
        <span className="text-sm font-bold text-ink">Show this collection on the homepage</span>
        <Switch checked={festive.enabled} onCheckedChange={(v) => setFestive({ ...festive, enabled: v })} data-testid="festive-enabled" />
      </label>
      <Button onClick={save} disabled={saving} className="rounded-none bg-ink font-bold uppercase text-cream hover:bg-yellow hover:text-ink" data-testid="festive-save">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save collection"}
      </Button>
    </div>
  );
}

function HeroTextManager() {
  const { settings, reloadSettings } = useStore();
  const [subtitle, setSubtitle] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (settings?.hero) setSubtitle(settings.hero.subtitle || "");
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try { await admin.updateSettings({ hero: { subtitle } }); await reloadSettings(); toast.success("Hero text updated"); }
    catch (err) { toast.error(apiErr(err)); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Label>Hero text</Label>
        <Textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={3} placeholder="Boldly designed everyday goods…" className="mt-1.5 rounded-none border-2 border-ink bg-cream" data-testid="hero-subtitle-input" />
      </div>
      <Button onClick={save} disabled={saving} className="rounded-none bg-ink font-bold uppercase text-cream hover:bg-yellow hover:text-ink" data-testid="hero-text-save">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save hero text"}
      </Button>
    </div>
  );
}

function CategoryImagesManager() {
  const { forYou, forPet, childrenOf, loaded, settings, reloadSettings } = useStore();
  const [busy, setBusy] = useState({});
  const fileRefs = useRef({});

  const forYouSubs = forYou ? childrenOf(forYou.id) : [];
  const forPetSubs = forPet ? childrenOf(forPet.id) : [];
  const allCats = [...forYouSubs, ...forPetSubs];
  const adminCatImages = settings?.category_images || {};

  const onUpload = async (slug, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy((b) => ({ ...b, [slug]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      await admin.uploadCategoryImage(slug, fd);
      await reloadSettings();
      toast.success(`Image updated for "${slug}"`);
    } catch (err) {
      toast.error(apiErr(err, "Upload failed"));
    } finally {
      setBusy((b) => ({ ...b, [slug]: false }));
      if (fileRefs.current[slug]) fileRefs.current[slug].value = "";
    }
  };

  const onDelete = async (slug) => {
    setBusy((b) => ({ ...b, [slug]: true }));
    try {
      await admin.deleteCategoryImage(slug);
      await reloadSettings();
      toast.success(`Custom image removed for "${slug}"`);
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setBusy((b) => ({ ...b, [slug]: false })); }
  };

  if (!loaded) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>;
  if (allCats.length === 0) return <p className="text-sm text-muted-foreground">No sub-categories found. Add them in WooCommerce and they will appear here automatically.</p>;

  return (
    <div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {allCats.map((cat) => {
          const adminImg = adminCatImages[cat.slug];
          const displayImg = adminImg
            ? `${process.env.REACT_APP_BACKEND_URL}${adminImg}`
            : cat.image || null;
          const isBusy = busy[cat.slug];
          return (
            <div key={cat.id} data-testid={`cat-img-tile-${cat.slug}`} className="group relative flex flex-col overflow-hidden border-2 border-ink">
              {/* Image area — landscape 4:3 to match homepage */}
              <div className="relative aspect-[4/3] w-full bg-oat">
                {displayImg ? (
                  <img
                    src={displayImg}
                    alt={cat.name}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-ink/20" />
                  </div>
                )}
                {/* Overlay buttons */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => fileRefs.current[cat.slug]?.click()}
                    disabled={isBusy}
                    data-testid={`cat-upload-${cat.slug}`}
                    className="flex items-center gap-1.5 bg-cream px-3 py-1.5 text-xs font-bold uppercase text-ink hover:bg-yellow disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {adminImg ? "Replace" : "Upload"}
                  </button>
                  {adminImg && (
                    <button
                      onClick={() => onDelete(cat.slug)}
                      disabled={isBusy}
                      data-testid={`cat-delete-${cat.slug}`}
                      className="flex items-center gap-1.5 bg-destructive px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
                {adminImg && (
                  <span className="absolute left-1.5 top-1.5 bg-terracotta px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-white">custom</span>
                )}
              </div>
              {/* Category name */}
              <div className="border-t-2 border-ink bg-cream px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-ink">
                {cat.name}
              </div>
              <input
                ref={(el) => (fileRefs.current[cat.slug] = el)}
                type="file"
                accept="image/*"
                onChange={(e) => onUpload(cat.slug, e)}
                className="hidden"
                data-testid={`cat-file-input-${cat.slug}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_ROW = { product_type: "", size: "", color: "", material: "" };
const COLS = [
  { key: "product_type", label: "Product Type", placeholder: "e.g. T-Shirt" },
  { key: "size",         label: "Size",         placeholder: "e.g. S, M, L, XL" },
  { key: "color",        label: "Color",        placeholder: "e.g. Red, Blue" },
  { key: "material",     label: "Material",     placeholder: "e.g. 100% Cotton" },
];

function CustomizableProductsManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);   // id being edited, or "new"
  const [draft, setDraft] = useState(EMPTY_ROW);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try { setRows(await admin.listCustomizableProducts()); }
    catch (err) { toast.error(apiErr(err, "Failed to load")); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startAdd = () => { setEditId("new"); setDraft(EMPTY_ROW); };
  const startEdit = (row) => { setEditId(row.id); setDraft({ product_type: row.product_type, size: row.size, color: row.color, material: row.material }); };
  const cancelEdit = () => { setEditId(null); setDraft(EMPTY_ROW); };

  const save = async () => {
    if (!draft.product_type.trim()) { toast.error("Product Type is required"); return; }
    setSaving(true);
    try {
      if (editId === "new") {
        const created = await admin.createCustomizableProduct(draft);
        setRows((r) => [...r, created]);
        toast.success("Product added");
      } else {
        const updated = await admin.updateCustomizableProduct(editId, draft);
        setRows((r) => r.map((x) => (x.id === editId ? updated : x)));
        toast.success("Product updated");
      }
      cancelEdit();
    } catch (err) { toast.error(apiErr(err, "Save failed")); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    setDeleting(id);
    try {
      await admin.deleteCustomizableProduct(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch (err) { toast.error(apiErr(err)); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>;

  return (
    <div data-testid="customizable-products-manager">
      <div className="mb-5 flex items-center justify-end gap-4">
        {editId !== "new" && (
          <Button
            onClick={startAdd}
            data-testid="cp-add-btn"
            className="shrink-0 rounded-none bg-ink font-bold uppercase text-cream hover:bg-yellow hover:text-ink"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink text-cream">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add new row */}
            {editId === "new" && (
              <tr className="border-b-2 border-ink bg-softyellow" data-testid="cp-new-row">
                {COLS.map((c) => (
                  <td key={c.key} className="px-3 py-2">
                    <Input
                      value={draft[c.key]}
                      onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
                      placeholder={c.placeholder}
                      data-testid={`cp-new-${c.key}`}
                      className="h-8 rounded-none border-ink bg-cream text-xs"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={save} disabled={saving} data-testid="cp-save-new" className="flex items-center gap-1 bg-ink px-3 py-1.5 text-xs font-bold text-cream hover:bg-green-700 disabled:opacity-50">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                    </button>
                    <button onClick={cancelEdit} className="flex items-center gap-1 border border-ink px-3 py-1.5 text-xs hover:bg-ink hover:text-cream" data-testid="cp-cancel-new">
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {rows.length === 0 && editId !== "new" && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm italic text-ink/40">
                  No customisable products yet. Click &quot;Add Product&quot; to get started.
                </td>
              </tr>
            )}

            {rows.map((row) =>
              editId === row.id ? (
                /* Edit row */
                <tr key={row.id} className="border-b border-ink/20 bg-softyellow" data-testid={`cp-edit-row-${row.id}`}>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      <Input
                        value={draft[c.key]}
                        onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
                        placeholder={c.placeholder}
                        data-testid={`cp-edit-${c.key}`}
                        className="h-8 rounded-none border-ink bg-cream text-xs"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={save} disabled={saving} data-testid={`cp-save-${row.id}`} className="flex items-center gap-1 bg-ink px-3 py-1.5 text-xs font-bold text-cream hover:bg-green-700 disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                      </button>
                      <button onClick={cancelEdit} className="flex items-center gap-1 border border-ink px-3 py-1.5 text-xs hover:bg-ink hover:text-cream" data-testid={`cp-cancel-${row.id}`}>
                        <X className="h-3 w-3" /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* Display row */
                <tr key={row.id} className="border-b border-ink/10 odd:bg-cream even:bg-oat/30 hover:bg-softyellow/60 transition-colors" data-testid={`cp-row-${row.id}`}>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-ink/80">
                      {row[c.key] || <span className="text-ink/30">—</span>}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(row)}
                        disabled={!!editId}
                        data-testid={`cp-edit-btn-${row.id}`}
                        className="flex items-center gap-1 border border-ink px-3 py-1.5 text-xs font-medium hover:bg-ink hover:text-cream disabled:opacity-30"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => remove(row.id)}
                        disabled={deleting === row.id || !!editId}
                        data-testid={`cp-delete-btn-${row.id}`}
                        className="flex items-center gap-1 border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-white disabled:opacity-30"
                      >
                        {deleting === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomizedOrdersManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try { setRows(await admin.listCustomizedOrders()); }
    catch (err) { toast.error(apiErr(err, "Failed to load")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    setDeleting(id);
    try {
      await admin.deleteCustomizedOrder(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch (err) { toast.error(apiErr(err)); }
    finally { setDeleting(null); }
  };

  const fmtDate = (d) => { if (!d) return "—"; try { return new Date(d).toLocaleString(); } catch { return "—"; } };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>;

  return (
    <div data-testid="customized-orders-manager">
      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-ink text-cream">
            <tr>
              {["Date", "Name", "Email", "Phone", "Product Type", "Size", "Color", "Material", "Instructions", "Design Files"].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-widest">{h}</th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={11} className="py-10 text-center text-sm italic text-ink/40">No customization requests yet.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/10 odd:bg-cream even:bg-oat/30 transition-colors hover:bg-softyellow/60" data-testid={`co-row-${row.id}`}>
                <td className="whitespace-nowrap px-3 py-3 text-ink/70">{fmtDate(row.created_at)}</td>
                <td className="px-3 py-3 text-ink/80">{row.name || "—"}</td>
                <td className="px-3 py-3 text-ink/80">{row.email || "—"}</td>
                <td className="px-3 py-3 text-ink/80">{row.phone || "—"}</td>
                <td className="px-3 py-3 text-ink/80">{row.product_type || "—"}</td>
                <td className="px-3 py-3 text-ink/80">{row.size || "—"}</td>
                <td className="px-3 py-3 text-ink/80">{row.color || "—"}</td>
                <td className="px-3 py-3 text-ink/80">{row.material || "—"}</td>
                <td className="max-w-[220px] px-3 py-3 text-ink/70">{row.additional_instructions ? <span className="whitespace-pre-wrap">{row.additional_instructions}</span> : "—"}</td>
                <td className="px-3 py-3 text-ink/80">
                  {Array.isArray(row.design_files) && row.design_files.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {row.design_files.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-ink underline underline-offset-2 hover:text-yellow-700">
                          <Paperclip className="h-3 w-3" /> {f.name || `File ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  ) : "—"}
                </td>
                <td className="px-3 py-3 text-right">
                  <button onClick={() => remove(row.id)} disabled={deleting === row.id} data-testid={`co-delete-btn-${row.id}`} className="ml-auto flex items-center gap-1 border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-white disabled:opacity-30">
                    {deleting === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeliveryManager() {
  const { settings, reloadSettings } = useStore();
  const [freeAbove, setFreeAbove] = useState("");
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.delivery) {
      setFreeAbove(String(settings.delivery.free_above ?? ""));
      setFee(String(settings.delivery.fee ?? ""));
    }
  }, [settings]);

  const save = async () => {
    const fa = Number(freeAbove), fe = Number(fee);
    if (!Number.isFinite(fa) || fa < 0 || !Number.isFinite(fe) || fe < 0) {
      toast.error("Please enter valid non-negative amounts");
      return;
    }
    setSaving(true);
    try {
      await admin.updateSettings({ delivery: { free_above: fa, fee: fe } });
      await reloadSettings();
      toast.success("Delivery fee updated");
    } catch (err) { toast.error(apiErr(err)); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-5" data-testid="delivery-manager">
      <div>
        <Label>Free delivery above (₹)</Label>
        <Input
          type="number" min="0" value={freeAbove}
          onChange={(e) => setFreeAbove(e.target.value)}
          placeholder="e.g. 1499"
          className="mt-1.5 rounded-none border-2 border-ink bg-cream"
          data-testid="delivery-free-above-input"
        />
        <p className="mt-1 text-xs text-muted-foreground">Orders at or above this cart value get free delivery.</p>
      </div>
      <div>
        <Label>Delivery fee (₹)</Label>
        <Input
          type="number" min="0" value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="e.g. 99"
          className="mt-1.5 rounded-none border-2 border-ink bg-cream"
          data-testid="delivery-fee-input"
        />
        <p className="mt-1 text-xs text-muted-foreground">Charged when the cart is below the free-delivery value.</p>
      </div>
      <Button onClick={save} disabled={saving} className="rounded-none bg-ink font-bold uppercase text-cream hover:bg-yellow hover:text-ink" data-testid="delivery-save">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save delivery fee"}
      </Button>
    </div>
  );
}

export default function AdminDashboard() {
  usePageMeta({ title: "Admin Dashboard — Sojaru" });
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (ready && !user?.is_admin) navigate("/admin/login"); }, [ready, user, navigate]);
  if (!ready || !user?.is_admin) return <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-ink pb-6">
        <div>
          <div className="inline-block bg-yellow px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink">Admin panel</div>
          <h1 className="mt-3 font-display text-4xl font-extrabold uppercase text-ink">Storefront Manager</h1>
        </div>
        <Button onClick={() => { logout(); navigate("/"); }} variant="outline" className="rounded-none border-2 border-ink" data-testid="admin-logout"><LogOut className="mr-2 h-4 w-4" /> Log out</Button>
      </div>

      <Tabs defaultValue="hero" className="mt-8">
        <TabsList className="mb-8 flex h-auto flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="hero" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-hero"><ImageIcon className="mr-2 h-4 w-4" /> Hero Banner</TabsTrigger>
          <TabsTrigger value="herotext" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-herotext"><LayoutTemplate className="mr-2 h-4 w-4" /> Hero Text</TabsTrigger>
          <TabsTrigger value="marquee" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-marquee"><Type className="mr-2 h-4 w-4" /> Moving Text</TabsTrigger>
          <TabsTrigger value="festive" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-festive"><Sparkles className="mr-2 h-4 w-4" /> Festive Collection</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-categories"><Grid3x3 className="mr-2 h-4 w-4" /> Category Images</TabsTrigger>
          <TabsTrigger value="customizable" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-customizable"><Package className="mr-2 h-4 w-4" /> Customizable Products</TabsTrigger>
          <TabsTrigger value="customized-orders" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-customized-orders"><ClipboardList className="mr-2 h-4 w-4" /> Customized Orders</TabsTrigger>
          <TabsTrigger value="delivery" className="rounded-none border-2 border-ink data-[state=active]:bg-yellow" data-testid="admin-tab-delivery"><Truck className="mr-2 h-4 w-4" /> Delivery Fee</TabsTrigger>
        </TabsList>
        <TabsContent value="hero"><HeroManager /></TabsContent>
        <TabsContent value="herotext"><HeroTextManager /></TabsContent>
        <TabsContent value="marquee"><MarqueeManager /></TabsContent>
        <TabsContent value="festive"><FestiveManager /></TabsContent>
        <TabsContent value="categories"><CategoryImagesManager /></TabsContent>
        <TabsContent value="customizable"><CustomizableProductsManager /></TabsContent>
        <TabsContent value="customized-orders"><CustomizedOrdersManager /></TabsContent>
        <TabsContent value="delivery"><DeliveryManager /></TabsContent>
      </Tabs>
    </div>
  );
}
