import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Truck, RefreshCw, Shield, ChevronRight, Check, Star } from "lucide-react";
import { products as productsApi } from "@/lib/api";
import { useStore } from "@/context/StoreContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProductCard } from "@/components/ProductCard";
import { ErrorState, EmptyState } from "@/components/States";
import { firstImage, stripHtml, discountPct } from "@/lib/product";
import { usePageMeta } from "@/hooks/usePageMeta";

function Loading() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="aspect-square rounded-2xl bg-oat" />
      <div className="space-y-4">
        <div className="h-4 w-1/4 rounded bg-oat" />
        <div className="h-10 w-3/4 rounded bg-oat" />
        <div className="h-6 w-1/3 rounded bg-oat" />
        <div className="h-24 w-full rounded bg-oat" />
        <div className="h-12 w-full rounded-full bg-oat" />
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { money, delivery } = useStore();
  const { addItem, setOpen } = useCart();

  const [product, setProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [selected, setSelected] = useState({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setLoading(true); setError(false); setSelected({}); setQty(1); setActiveImg(0); setVariations([]); setRelated([]);
    productsApi.bySlug(slug)
      .then((p) => {
        setProduct(p);
        setLoading(false);
        if (p.type === "variable") productsApi.variations(p.id).then(setVariations).catch(() => {});
        productsApi.related(p.id).then(setRelated).catch(() => {});
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  usePageMeta(product ? {
    title: `${product.name} — Sojaru`,
    description: stripHtml(product.short_description || product.description).slice(0, 155),
    image: firstImage(product),
  } : {});

  const variationAttrs = useMemo(
    () => (product?.attributes || []).filter((a) => a.variation),
    [product]
  );

  const matchedVariation = useMemo(() => {
    if (!variationAttrs.length) return null;
    if (variationAttrs.some((a) => !selected[a.name])) return null;
    return variations.find((v) =>
      v.attributes.every((va) => {
        const sel = selected[va.name];
        return !va.option || va.option === sel;
      })
    );
  }, [variations, selected, variationAttrs]);

  useEffect(() => {
    if (product) {
      const ld = {
        "@context": "https://schema.org", "@type": "Product",
        name: product.name, image: product.images?.map((i) => i.src),
        description: stripHtml(product.short_description || product.description).slice(0, 300),
        sku: product.sku || undefined,
        offers: { "@type": "Offer", priceCurrency: "USD", price: product.price,
          availability: product.stock_status === "instock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
      };
      let el = document.getElementById("product-ld");
      if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = "product-ld"; document.head.appendChild(el); }
      el.textContent = JSON.stringify(ld);
      return () => { el?.remove(); };
    }
  }, [product]);

  if (loading) return <Loading />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-24"><ErrorState onRetry={() => navigate(0)} /></div>;
  if (!product) return <div className="mx-auto max-w-3xl px-4 py-24"><EmptyState title="Product not found" message="This product may have been unpublished." /></div>;

  const isVariable = product.type === "variable";
  const mv = matchedVariation;
  const onSale = mv ? (mv.on_sale && Number(mv.sale_price) > 0) : (product.on_sale && Number(product.sale_price) > 0);
  const price = mv ? (onSale ? mv.sale_price : mv.regular_price) : (onSale ? product.sale_price : product.price);
  const showFrom = isVariable && !mv;
  const displayPrice = showFrom ? product.price : price;
  const regPrice = mv ? mv.regular_price : product.regular_price;
  const stockStatus = matchedVariation ? matchedVariation.stock_status : product.stock_status;
  const stockQty = matchedVariation ? matchedVariation.stock_quantity : product.stock_quantity;
  const outOfStock = stockStatus === "outofstock";
  const needsSelection = isVariable && variationAttrs.some((a) => !selected[a.name]);

  const optionAvailable = (attrName, option) => {
    if (!isVariable) return true;
    return variations.some((v) => {
      if (v.stock_status === "outofstock") return false;
      const optMatch = v.attributes.find((va) => va.name === attrName);
      if (optMatch && optMatch.option && optMatch.option !== option) return false;
      return Object.entries(selected).every(([k, val]) => {
        if (k === attrName) return true;
        const m = v.attributes.find((va) => va.name === k);
        return !m || !m.option || m.option === val;
      });
    });
  };

  const gallery = product.images?.length ? product.images : [{ src: firstImage(product), alt: product.name }];
  const variantLabel = Object.entries(selected).map(([k, v]) => `${k}: ${v}`).join(" · ");

  const buildLine = () => ({
    productId: product.id,
    variationId: matchedVariation?.id || null,
    name: product.name,
    slug: product.slug,
    price,
    image: matchedVariation?.image || firstImage(product),
    quantity: qty,
    variantLabel: variantLabel || undefined,
  });

  const addToCart = () => { if (!needsSelection && !outOfStock) addItem(buildLine()); };
  const buyNow = () => { if (!needsSelection && !outOfStock) { addItem(buildLine(), { silent: true }); setOpen(false); navigate("/checkout"); } };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-1 py-3 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink">Home</Link>
        <ChevronRight className="h-3 w-3" />
        {product.categories?.[0] && <><Link to={`/category/${product.categories[0].slug}`} className="hover:text-ink">{product.categories[0].name}</Link><ChevronRight className="h-3 w-3" /></>}
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden bg-oat">
            <img src={gallery[activeImg]?.src} alt={gallery[activeImg]?.alt || product.name} className="aspect-square w-full object-cover" data-testid="pdp-main-image" />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-3">
              {gallery.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`h-20 w-16 overflow-hidden border-2 ${activeImg === i ? "border-ink" : "border-transparent"}`} data-testid={`pdp-thumb-${i}`}>
                  <img src={img.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="eyebrow text-terracotta">{product.categories?.[0]?.name || "Sojaru"}</p>
          <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl" data-testid="pdp-title">{product.name}</h1>

          {Number(product.rating_count) > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm text-ink/70">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(product.average_rating) ? "fill-amber text-amber" : "text-border"}`} />)}
              <span className="ml-1">({product.rating_count})</span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 font-mono">
            {showFrom && <span className="text-sm font-sans font-medium text-muted-foreground">From</span>}
            <span className="text-2xl font-semibold text-ink" data-testid="pdp-price">{money(displayPrice)}</span>
            {!showFrom && onSale && Number(regPrice) > Number(price) && (
              <>
                <span className="text-lg text-muted-foreground line-through">{money(regPrice)}</span>
                <span className="bg-terracotta/10 px-2.5 py-1 text-xs font-semibold text-terracotta">Save {discountPct({ regular_price: regPrice, sale_price: price })}%</span>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="mt-5 text-base leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.short_description }} />
          )}

          {/* Variation selectors */}
          {variationAttrs.map((attr) => (
            <div key={attr.name} className="mt-6">
              <p className="mb-2 text-sm font-bold text-ink">{attr.name}{selected[attr.name] && <span className="ml-2 font-normal text-muted-foreground">{selected[attr.name]}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {attr.options.map((opt) => {
                  const avail = optionAvailable(attr.name, opt);
                  const active = selected[attr.name] === opt;
                  return (
                    <button
                      key={opt}
                      disabled={!avail}
                      onClick={() => setSelected((s) => ({ ...s, [attr.name]: opt }))}
                      data-testid={`variation-${attr.name}-${opt}`}
                      className={`min-w-[3rem] border px-4 py-2 text-sm font-medium transition-all ${active ? "border-ink bg-ink text-cream" : "border-border text-ink hover:border-ink"} ${!avail ? "cursor-not-allowed opacity-30 line-through" : ""}`}
                    >
                      {active && <Check className="mr-1 inline h-3.5 w-3.5" />}{opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Stock */}
          <div className="mt-6 text-sm">
            {outOfStock ? (
              <span className="font-semibold text-terracotta">Out of stock</span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-matcha"><span className="h-2 w-2 rounded-full bg-matcha" /> In stock{stockQty ? ` · ${stockQty} left` : ""}</span>
            )}
          </div>

          {/* Qty + actions */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border border-border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3" aria-label="Decrease" data-testid="pdp-qty-dec"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-mono" data-testid="pdp-qty">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="p-3" aria-label="Increase" data-testid="pdp-qty-inc"><Plus className="h-4 w-4" /></button>
            </div>
            <Button onClick={addToCart} disabled={needsSelection || outOfStock} data-testid="pdp-add-to-cart-button" className="h-13 flex-1 bg-ink py-3.5 text-base font-semibold text-cream transition-all hover:bg-terracotta disabled:opacity-50">
              <ShoppingBag className="mr-2 h-5 w-5" /> {outOfStock ? "Sold out" : needsSelection ? "Select options" : "Add to Bag"}
            </Button>
          </div>
          <Button onClick={buyNow} disabled={needsSelection || outOfStock} variant="outline" data-testid="pdp-buy-now-button" className="mt-3 h-13 w-full border-ink py-3.5 text-base font-semibold text-ink transition-all hover:bg-ink hover:text-cream disabled:opacity-50">
            Buy Now
          </Button>

          {/* Trust icons */}
          <div className="mt-6 grid grid-cols-3 gap-3 bg-oat/60 p-4 text-center text-xs text-ink/70">
            <div className="flex flex-col items-center gap-1"><Truck className="h-5 w-5 text-matcha" /> Free ship {money(delivery.free_above)}+</div>
            <div className="flex flex-col items-center gap-1"><RefreshCw className="h-5 w-5 text-matcha" /> 7-14 days delivery</div>
            <div className="flex flex-col items-center gap-1"><Shield className="h-5 w-5 text-matcha" /> Secure checkout</div>
          </div>

          {/* Accordions */}
          <Accordion type="single" collapsible className="mt-6" defaultValue="details">
            <AccordionItem value="details">
              <AccordionTrigger data-testid="pdp-accordion-details" className="text-sm font-bold">Product details</AccordionTrigger>
              <AccordionContent>
                <div className="prose-sm text-sm leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.description || product.short_description || "Thoughtfully made by Sojaru." }} />
                {product.sku && <p className="mt-3 font-mono text-xs text-muted-foreground">SKU: {product.sku}</p>}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 font-display text-3xl text-ink">You may also love</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
