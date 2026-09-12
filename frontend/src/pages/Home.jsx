import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/StoreContext";
import { useProducts } from "@/hooks/useProducts";
import { ProductRow } from "@/components/ProductRow";
import { catImage } from "@/lib/assets";
import { mediaUrl, store, orders, apiErr } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { usePageMeta } from "@/hooks/usePageMeta";

// ─── 1. HERO ──────────────────────────────────────────────────────────────────
function Hero() {
  const { settings } = useStore();
  const heroImages = (Array.isArray(settings?.hero_images) ? settings.hero_images : []).filter((h) => h.url);
  const heroText = settings?.hero?.subtitle || "";
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    if (heroImages.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  return (
    <section
      className="relative overflow-hidden w-full aspect-[827/1600] sm:aspect-auto sm:h-[90vh] lg:h-[95vh]"
      data-testid="hero-section"
    >
      <div className="relative h-full w-full">
        {heroImages.length > 0 ? (
          heroImages.map((img, i) => (
            <img
              key={i}
              src={mediaUrl(img.url)}
              alt={img.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                i === idx ? "opacity-100" : "opacity-0"
              }`}
            />
          ))
        ) : (
          <div className="absolute inset-0 bg-[#1a0f0a]" />
        )}
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
      </div>

      {/* Hero text overlay from admin — bottom-left */}
      {heroText && (
        <div className="absolute bottom-8 left-6 sm:bottom-10 sm:left-10 lg:bottom-12 lg:left-14" data-testid="hero-text-overlay">
          <p
            className="max-w-lg font-display text-2xl italic text-white sm:text-3xl lg:text-4xl"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
          >
            {heroText}
          </p>
        </div>
      )}

      {/* Slide dots */}
      {heroImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              data-testid={`hero-dot-${i}`}
              className={`h-0.5 transition-all ${
                i === idx ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── 2. CUSTOMIZE SECTION (video + message + customization form) ──────────────
const splitOpts = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const EMPTY_FORM = { name: "", email: "", phone: "", product_type: "", size: "", color: "", material: "", additional_instructions: "" };

function CustomizeSection() {
  const [cprods, setCprods] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    store.customizableProducts().then(setCprods).catch(() => setCprods([]));
  }, []);

  // Unique product types (first matching row supplies the option lists)
  const productTypes = [];
  const seen = new Set();
  for (const p of cprods) {
    const t = (p.product_type || "").trim();
    if (t && !seen.has(t)) { seen.add(t); productTypes.push(t); }
  }
  const selectedRow = cprods.find((p) => (p.product_type || "").trim() === form.product_type);
  const sizeOpts = splitOpts(selectedRow?.size);
  const colorOpts = splitOpts(selectedRow?.color);
  const materialOpts = splitOpts(selectedRow?.material);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onProductType = (v) => setForm((f) => ({ ...f, product_type: v, size: "", color: "", material: "" }));

  const submit = async (e) => {
    e.preventDefault();
    const required = ["name", "email", "phone", "product_type", "size", "color", "material"];
    const missing = required.some((k) => !String(form[k] || "").trim());
    if (missing) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      files.forEach((f) => fd.append("design_files", f));
      await orders.createCustomized(fd);
      toast.success("Thanks! We've received your customization request 🐾");
      setForm(EMPTY_FORM);
      setFiles([]);
    } catch (err) {
      toast.error(apiErr(err, "Could not submit right now. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "h-9 rounded-none border border-cream/70 bg-white/10 text-xs text-cream placeholder:text-cream/50 focus-visible:ring-cream/60";
  const selectCls = "h-9 rounded-none border border-cream/70 bg-white/10 text-xs text-cream";

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-ink" data-testid="customize-section">
      {/* Fullscreen background video (behaves like a GIF) */}
      <video
        src="/customize.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        data-testid="customize-video"
      />
      {/* Subtle overlay so the transparent form stays readable over the video */}
      <div className="absolute inset-0 bg-ink/45" />

      {/* Message centered at top; transparent form aligned to the RIGHT of the section */}
      <div className="relative z-10 flex min-h-screen flex-col justify-center gap-6 px-4 py-12 sm:px-8 lg:px-16">
        <h2 className="mx-auto max-w-2xl text-center font-display text-base italic leading-snug text-cream drop-shadow-md sm:text-lg" data-testid="customize-message">
          Even Tintin would love to customize something for himself and Snowy. Would you? 🐾
        </h2>

        {/* Form (right-aligned) */}
        <form onSubmit={submit} className="w-full max-w-sm space-y-2.5 sm:ml-auto" data-testid="customize-form">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Your Name</label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Tintin" className={inputCls} data-testid="cf-name" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Your Email Id</label>
              <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="you@example.com" className={inputCls} data-testid="cf-email" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Your Phone No</label>
              <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="9876543210" className={inputCls} data-testid="cf-phone" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Product Type</label>
              <Select value={form.product_type} onValueChange={onProductType}>
                <SelectTrigger className={selectCls} data-testid="cf-product-type"><SelectValue placeholder="Select a product" /></SelectTrigger>
                <SelectContent className="rounded-none border-2 border-ink bg-cream">
                  {productTypes.length === 0 ? (
                    <div className="px-3 py-2 text-xs italic text-ink/40">No customizable products yet</div>
                  ) : (
                    productTypes.map((t) => <SelectItem key={t} value={t} className="rounded-none">{t}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Size</label>
                <Select value={form.size} onValueChange={(v) => setField("size", v)} disabled={!form.product_type || sizeOpts.length === 0}>
                  <SelectTrigger className={selectCls} data-testid="cf-size"><SelectValue placeholder={form.product_type ? (sizeOpts.length ? "Size" : "—") : "—"} /></SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-ink bg-cream">
                    {sizeOpts.map((o) => <SelectItem key={o} value={o} className="rounded-none">{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Color</label>
                <Select value={form.color} onValueChange={(v) => setField("color", v)} disabled={!form.product_type || colorOpts.length === 0}>
                  <SelectTrigger className={selectCls} data-testid="cf-color"><SelectValue placeholder={form.product_type ? (colorOpts.length ? "Color" : "—") : "—"} /></SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-ink bg-cream">
                    {colorOpts.map((o) => <SelectItem key={o} value={o} className="rounded-none">{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Material</label>
                <Select value={form.material} onValueChange={(v) => setField("material", v)} disabled={!form.product_type || materialOpts.length === 0}>
                  <SelectTrigger className={selectCls} data-testid="cf-material"><SelectValue placeholder={form.product_type ? (materialOpts.length ? "Material" : "—") : "—"} /></SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-ink bg-cream">
                    {materialOpts.map((o) => <SelectItem key={o} value={o} className="rounded-none">{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Your Design Idea <span className="normal-case text-cream/50">(optional — attach documents)</span></label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                data-testid="cf-design-files"
                className="block w-full text-xs text-cream/80 file:mr-3 file:cursor-pointer file:border file:border-cream/70 file:bg-white/10 file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-cream hover:file:bg-white/20"
              />
              {files.length > 0 && <p className="mt-1 text-[10px] text-cream/60" data-testid="cf-files-count">{files.length} file(s) selected</p>}
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-cream/90">Additional Design Instructions <span className="normal-case text-cream/50">(optional)</span></label>
              <textarea
                value={form.additional_instructions}
                onChange={(e) => setField("additional_instructions", e.target.value)}
                rows={2}
                placeholder="Any specific details…"
                data-testid="cf-instructions"
                className="w-full rounded-none border border-cream/70 bg-white/10 px-3 py-2 text-xs text-cream placeholder:text-cream/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cream/60"
              />
            </div>

            <Button type="submit" disabled={submitting} data-testid="cf-submit" className="mt-3 h-10 w-full rounded-none bg-cream text-xs font-bold uppercase tracking-widest text-ink hover:bg-yellow hover:text-ink">
              {submitting ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Sending…</> : "Submit request"}
            </Button>
            <p className="mt-4 text-center text-xs leading-relaxed text-cream/80" data-testid="cf-contact-note">
              Have a question? We'd love to hear from you. Reach out to us at{" "}
              <a href="tel:+919477909496" className="whitespace-nowrap font-semibold text-cream underline underline-offset-2 hover:text-yellow">+91 94779 09496</a>
            </p>
          </form>
      </div>
    </section>
  );
}

// ─── 3. FESTIVE COLLECTION (admin-configured) ─────────────────────────────────
function FestiveSection() {
  const { settings } = useStore();
  const festive = settings?.festive;
  const catId = festive?.category_id;
  const { items, loading, error, reload } = useProducts({ category: catId || undefined, per_page: 8 }, [catId]);
  if (!festive || !festive.enabled || !catId) return null;
  if (!loading && !error && items.length === 0) return null;
  return (
    <section className="bg-softyellow py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2
            className="font-display text-2xl italic text-ink sm:text-3xl lg:text-4xl"
            data-testid="festive-title"
          >
            {festive.title}
          </h2>
          <Link
            to="/category/festive-collections"
            className="shrink-0 text-sm italic text-ink/45 hover:text-ink underline underline-offset-4"
          >
            view all
          </Link>
        </div>
        <ProductRow
          items={items}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMsg="Assign products to your Festive Collections category in WooCommerce."
        />
      </div>
    </section>
  );
}

// ─── 3a. WORLDS (For You / For Your Pet) — two-part card below Festive ─────────
function WorldsSection() {
  const { forYou, forPet } = useStore();
  const cards = [
    {
      title: "For You",
      subtitle: "Clothing, accessories & more, picked just for you",
      img: "/for-you.jpg",
      to: forYou ? `/shop/${forYou.slug}` : "/shop/for-you",
      testid: "world-for-you",
    },
    {
      title: "For Your Pet",
      subtitle: "Treats, toys & goods for your best friend",
      img: "/for-your-pet.jpg",
      to: forPet ? `/shop/${forPet.slug}` : "/shop/for-your-pet",
      testid: "world-for-pet",
    },
  ];
  return (
    <section className="bg-cream py-14 sm:py-18" data-testid="worlds-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cards.map((c) => (
            <div key={c.title} data-testid={c.testid} className="group relative overflow-hidden border-2 border-ink">
              <div className="aspect-[4/3] w-full overflow-hidden">
                <img src={c.img} alt={c.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-end p-8 text-center">
                <h3 className="font-display text-3xl italic text-cream drop-shadow-md sm:text-4xl">{c.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-cream/85 drop-shadow">{c.subtitle}</p>
                <Link to={c.to} data-testid={`${c.testid}-shop`} className="mt-5 inline-block rounded-none bg-cream px-8 py-3 text-xs font-bold uppercase tracking-widest text-ink transition-colors hover:bg-yellow">
                  Shop Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 4. CATEGORY BENTO GRID (text overlay, landscape, varying col spans) ──────
const BENTO_SPANS = [2, 2, 1, 2, 1, 2, 2, 3, 2, 3, 2, 2, 1];

function CategoryRow() {
  const { forYou, forPet, childrenOf, loaded, settings } = useStore();
  const forYouSubs = forYou ? childrenOf(forYou.id) : [];
  const forPetSubs = forPet ? childrenOf(forPet.id) : [];
  const all = [...forYouSubs, ...forPetSubs];
  const adminCatImages = settings?.category_images || {};

  if (!loaded || all.length === 0) return null;

  return (
    <section className="bg-cream py-8 sm:py-10" data-testid="category-bento-grid">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ gap: "8px" }}>
          {all.map((c, i) => {
            const span = BENTO_SPANS[i % BENTO_SPANS.length];
            // Tailwind safelist — keep as literals so purger keeps them
            const spanCls =
              span === 3 ? "lg:col-span-3" : span === 2 ? "lg:col-span-2" : "lg:col-span-1";
            const imgSrc = adminCatImages[c.slug]
              ? mediaUrl(adminCatImages[c.slug])
              : c.image || catImage(c.slug);

            return (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                data-testid={`category-tile-${c.slug}`}
                className={`group relative col-span-1 overflow-hidden ${spanCls}`}
              >
                {/* Landscape image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={c.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                    onError={(e) => { e.target.src = catImage(c.slug); }}
                  />
                  {/* Subtle vignette so white text is always readable */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                  {/* Category name overlaid and centered */}
                  <div className="absolute inset-0 flex items-center justify-center px-3">
                    <p
                      className="text-center font-display text-lg text-white sm:text-xl lg:text-2xl"
                      style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.3)" }}
                    >
                      {c.name}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── GENERIC PRODUCT SECTION (hyppy italic heading style) ─────────────────────
function ProductSection({ slug, title, to, bg = "bg-cream" }) {
  const { bySlug, loaded } = useStore();
  const cat = bySlug(slug);
  const { items, loading, error, reload } = useProducts(
    { category: cat?.id, per_page: 8 },
    [cat?.id]
  );
  // When categories loaded but slug not found (WC API down / slug mismatch) → show error not infinite spinner
  const catMissing = loaded && !cat;
  return (
    <section className={`${bg} py-12 sm:py-16`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl italic text-ink sm:text-3xl lg:text-4xl">
            {title}
          </h2>
          <Link to={to} className="shrink-0 text-sm italic text-ink/45 hover:text-ink underline underline-offset-4">
            view all
          </Link>
        </div>
        <ProductRow
          items={items}
          loading={loading || !loaded}
          error={error || catMissing}
          onRetry={reload}
          emptyMsg="Assign products to this collection in WooCommerce and they'll show up here."
        />
      </div>
    </section>
  );
}

// ─── 7. SHEER JOY SECTION (on-sale, warm background) ─────────────────────────
function SheerJoySection() {
  const { bySlug, loaded } = useStore();
  const cat = bySlug("on-sale");
  const { items, loading, error, reload } = useProducts(
    { category: cat?.id, per_page: 8 },
    [cat?.id]
  );
  const catMissing = loaded && !cat;
  if (!loading && !error && !catMissing && items.length === 0) return null;
  return (
    <section className="bg-oat/40" data-testid="sheer-joy-section">
      {/* Section heading */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl italic text-terracotta sm:text-3xl lg:text-4xl">
              Sheer Joy
            </h2>
            <p className="mt-1 text-sm italic text-ink/40">our sale picks — good things, better prices.</p>
          </div>
          <Link to="/category/on-sale" className="shrink-0 text-sm italic text-ink/45 hover:text-ink underline underline-offset-4">
            view all
          </Link>
        </div>
        <ProductRow
          items={items}
          loading={loading || !loaded}
          error={error || catMissing}
          onRetry={reload}
          emptyMsg="Add products to your on-sale collection in WooCommerce."
        />
      </div>
    </section>
  );
}

// ─── 8. OUR STORY ─────────────────────────────────────────────────────────────
function OurStory() {
  return (
    <section className="bg-softyellow py-16 sm:py-20" data-testid="our-story-section">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:gap-16">
          {/* Illustration */}
          <div className="w-full shrink-0 md:w-80 lg:w-96">
            <div className="overflow-hidden rounded-sm shadow-md">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/a362ff3d-4e3f-413b-9c58-8f38bd2c42b7/images/b758193c3085e04e391e8689697af752fd87580876232a36cd8bb16e037b413a.jpeg"
                alt="The brother and sister behind Sojaru"
                className="w-full object-cover"
              />
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 text-center md:text-left">
            <p className="eyebrow mb-3 text-ink/40">our story</p>
            <h2 className="font-display text-3xl italic text-ink sm:text-4xl">
              a dream, a bond, a beginning.
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-ink/60">
              <p>
                Sojaru was born from a simple, stubborn belief — that one brother had in
                his sister&apos;s extraordinary talent. She had always created beautiful things,
                quietly, for the love of it. He saw a world that needed to see them too.
              </p>
              <p>
                So together, they took the leap. Sojaru is their shared dream: a space
                that feels like home — imperfect, expressive, and full of heart. Every
                piece is made with the care of someone who grew up believing that beautiful
                things deserve to be shared.
              </p>
              <p className="font-display italic text-ink/70">
                made with love. built with belief.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function Home() {
  usePageMeta({
    title: "Sojaru — Bohemian Lifestyle Brand",
    description:
      "A bohemian lifestyle brand for people who like their homes a little imperfect, a little expressive, and full of heart. Shop clothing, accessories, pet goods and more.",
  });

  return (
    <>
      <Hero />
      <CustomizeSection />

      <FestiveSection />
      <WorldsSection />
      <CategoryRow />
      <ProductSection
        slug="featured"
        title="your favorites are back.."
        to="/category/featured"
      />
      <ProductSection
        slug="best-sellers"
        title="Our Best Sellers"
        to="/category/best-sellers"
        bg="bg-oat/30"
      />
      <SheerJoySection />
      <OurStory />
    </>
  );
}
