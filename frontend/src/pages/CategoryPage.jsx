import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SlidersHorizontal, Check, X } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { products as productsApi } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton, ErrorState, EmptyState } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { usePageMeta } from "@/hooks/usePageMeta";

const SORTS = [
  { v: "featured", label: "Featured", params: { orderby: "menu_order", order: "asc" } },
  { v: "newest", label: "Newest", params: { orderby: "date", order: "desc" } },
  { v: "price-asc", label: "Price: Low to High", params: { orderby: "price", order: "asc" } },
  { v: "price-desc", label: "Price: High to Low", params: { orderby: "price", order: "desc" } },
  { v: "popular", label: "Popular", params: { orderby: "popularity", order: "desc" } },
];

function attrValues(items, name) {
  const set = new Set();
  items.forEach((p) => p.attributes?.forEach((a) => {
    if (a.name?.toLowerCase() === name && a.variation) (a.options || []).forEach((o) => set.add(o));
  }));
  return [...set];
}

export default function CategoryPage({ special }) {
  const { slug } = useParams();
  const { bySlug, loaded, childrenOf } = useStore();
  const category = special ? null : bySlug(slug);

  // Dynamic "sections" = child categories of this sub-category (e.g. Clothing → T-shirts,
  // Female Crop Tops). Pulled live from WooCommerce, so adding a child in wp-admin makes a
  // new filter appear here automatically. Empty for top-level/special pages.
  const sections = useMemo(() => (category ? childrenOf(category.id) : []), [category, childrenOf]);
  const [activeSection, setActiveSection] = useState(null); // null = "All"

  const [sort, setSort] = useState("featured");
  const [inStock, setInStock] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const title = special === "new-arrivals" ? "New Arrivals" : special === "sale" ? "On Sale" : category?.name;
  const desc = special === "new-arrivals" ? "The latest additions to the Sojaru family — fresh off the shelves."
    : special === "sale" ? "Loved pieces at a lovable price. While stocks last."
    : category?.description || `Explore ${category?.name || "our"} at Sojaru — made for you and your best friend.`;

  usePageMeta({ title: `${title || "Shop"} — Sojaru`, description: desc?.replace(/<[^>]*>/g, "") });

  const effectiveSort = special === "new-arrivals" ? SORTS[1] : SORTS.find((s) => s.v === sort);

  // Reset selected section when navigating to a different category page
  useEffect(() => { setActiveSection(null); }, [slug, special]);

  useEffect(() => { setPage(1); }, [slug, special, sort, inStock, priceMin, priceMax, activeSection]);

  useEffect(() => {
    if (!loaded) return;
    if (!special && !category) { setLoading(false); return; }
    setLoading(true); setError(false);
    const params = {
      per_page: 12, page,
      ...effectiveSort.params,
    };
    // A selected section narrows to that child category; otherwise the parent category
    if (category) params.category = activeSection || category.id;
    if (special === "sale") params.on_sale = true;
    if (special === "new-arrivals") { params.orderby = "date"; params.order = "desc"; }
    if (inStock) params.stock_status = "instock";
    if (priceMin) params.min_price = priceMin;
    if (priceMax) params.max_price = priceMax;
    productsApi.list(params)
      .then((d) => {
        setPages(d.pages || 1);
        setItems((prev) => (page === 1 ? d.items : [...prev, ...d.items]));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, slug, special, category?.id, activeSection, page, sort, inStock, priceMin, priceMax]);

  const availSizes = useMemo(() => attrValues(items, "size"), [items]);
  const availColors = useMemo(() => attrValues(items, "color"), [items]);

  const filtered = useMemo(() => items.filter((p) => {
    if (inStock && p.stock_status === "outofstock") return false;
    const matchAttr = (name, sel) => {
      if (!sel.length) return true;
      const a = p.attributes?.find((x) => x.name?.toLowerCase() === name);
      if (!a) return false;
      return sel.some((s) => (a.options || []).includes(s));
    };
    return matchAttr("size", sizes) && matchAttr("color", colors);
  }), [items, inStock, sizes, colors]);

  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const clearFilters = () => { setInStock(false); setPriceMin(""); setPriceMax(""); setSizes([]); setColors([]); };
  const activeCount = (inStock ? 1 : 0) + (priceMin || priceMax ? 1 : 0) + sizes.length + colors.length;

  const Filters = () => (
    <div className="space-y-8" data-testid="filter-panel">
      <div>
        <h4 className="mb-3 text-sm font-bold text-ink">Availability</h4>
        <label className="flex items-center justify-between text-sm text-ink/80">
          In stock only
          <Switch checked={inStock} onCheckedChange={setInStock} data-testid="filter-instock" />
        </label>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold text-ink">Price</h4>
        <div className="flex items-center gap-2">
          <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} inputMode="numeric" placeholder="Min" data-testid="filter-price-min" className="w-full border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-ink" />
          <span className="text-muted-foreground">–</span>
          <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} inputMode="numeric" placeholder="Max" data-testid="filter-price-max" className="w-full border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-ink" />
        </div>
      </div>
      {availSizes.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">Size</h4>
          <div className="flex flex-wrap gap-2">
            {availSizes.map((s) => (
              <button key={s} onClick={() => toggle(sizes, setSizes, s)} data-testid={`filter-size-${s}`} className={`border px-3.5 py-1.5 text-sm transition-colors ${sizes.includes(s) ? "border-ink bg-ink text-cream" : "border-border text-ink hover:border-ink"}`}>{s}</button>
            ))}
          </div>
        </div>
      )}
      {availColors.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">Color</h4>
          <div className="flex flex-wrap gap-2">
            {availColors.map((c) => (
              <button key={c} onClick={() => toggle(colors, setColors, c)} data-testid={`filter-color-${c}`} className={`flex items-center gap-1.5 border px-3.5 py-1.5 text-sm transition-colors ${colors.includes(c) ? "border-ink bg-ink text-cream" : "border-border text-ink hover:border-ink"}`}>
                {colors.includes(c) && <Check className="h-3.5 w-3.5" />} {c}
              </button>
            ))}
          </div>
        </div>
      )}
      {activeCount > 0 && (
        <button onClick={clearFilters} data-testid="clear-filters" className="flex items-center gap-1 text-sm font-semibold text-terracotta">
          <X className="h-4 w-4" /> Clear all filters
        </button>
      )}
    </div>
  );

  if (loaded && !special && !category) {
    return <div className="mx-auto max-w-7xl px-4 py-24"><EmptyState title="Category not found" message="This category doesn't exist. Browse our worlds instead." /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-8">
        <p className="eyebrow text-terracotta">Sojaru</p>
        <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">{title}</h1>
        {desc && <p className="mt-3 max-w-2xl text-base text-muted-foreground" dangerouslySetInnerHTML={{ __html: desc }} />}

        {sections.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2.5" data-testid="section-filters">
            <button
              onClick={() => setActiveSection(null)}
              data-testid="section-filter-all"
              className={`border px-4 py-1.5 text-sm font-medium transition-colors ${activeSection === null ? "border-ink bg-ink text-cream" : "border-border text-ink hover:border-ink"}`}
            >
              All
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                data-testid={`section-filter-${s.slug}`}
                className={`border px-4 py-1.5 text-sm font-medium transition-colors ${activeSection === s.id ? "border-ink bg-ink text-cream" : "border-border text-ink hover:border-ink"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-10">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-28"><Filters /></div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="border-ink" data-testid="mobile-filter-trigger">
                    <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters {activeCount > 0 && `(${activeCount})`}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto bg-cream">
                  <SheetTitle className="mb-6 font-display text-2xl">Filters</SheetTitle>
                  <Filters />
                </SheetContent>
              </Sheet>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">{filtered.length} {filtered.length === 1 ? "product" : "products"}</p>
            <Select value={special === "new-arrivals" ? "newest" : sort} onValueChange={setSort} disabled={special === "new-arrivals"}>
              <SelectTrigger className="w-52 border-border" data-testid="sort-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.v} value={s.v} data-testid={`sort-${s.v}`}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading && page === 1 ? <ProductGridSkeleton /> : error ? <ErrorState onRetry={() => setPage(1)} /> : filtered.length === 0 ? (
            <EmptyState title="No products found" message="Try adjusting your filters, or check back soon — new products from WooCommerce appear here automatically." action={activeCount > 0 && <Button onClick={clearFilters} className="mt-5 rounded-full">Clear filters</Button>} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
                {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
              {page < pages && (
                <div className="mt-12 flex justify-center">
                  <Button onClick={() => setPage((p) => p + 1)} disabled={loading} variant="outline" className="h-12 border-ink px-10 font-medium tracking-wide hover:bg-ink hover:text-cream" data-testid="load-more">
                    {loading ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
