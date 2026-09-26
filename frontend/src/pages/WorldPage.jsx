import { useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton, SectionHeader, ErrorState, EmptyState } from "@/components/States";
import { IMAGES, catImage } from "@/lib/assets";
import { mediaUrl } from "@/lib/api";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function WorldPage() {
  const { slug } = useParams();
  const { categories, loaded, childrenOf, settings } = useStore();
  const adminCatImages = settings?.category_images || {};
  const world = categories.find((c) => c.slug === slug && c.parent === 0);
  const subs = world ? childrenOf(world.id) : [];
  const childIds = subs.map((c) => c.id).join(",");
  const isPet = slug === "for-your-pet";
  const heroImg = isPet ? IMAGES.worldForPet : IMAGES.worldForYou;

  const { items, loading, error, reload } = useProducts(
    { category: childIds || undefined, per_page: 12, orderby: "menu_order", order: "asc" },
    [childIds]
  );

  usePageMeta({
    title: `${world?.name || "Shop"} — Sojaru`,
    description: world?.name === "For Your Pet"
      ? "Shop Sojaru pet tags and unisex dog shirts, made for your best friend."
      : "Shop Sojaru clothing, drinkware, caps, bags and more — made for you.",
  });

  if (loaded && !world) {
    return <div className="mx-auto max-w-7xl px-4 py-24 text-center"><EmptyState title="World not found" message="This shopping world doesn't exist." /></div>;
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt={world?.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/40 to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <span className="eyebrow animate-fade-up text-cream/80">Sojaru · {isPet ? "For Your Pet" : "For You"}</span>
          <h1 className="mt-3 max-w-xl animate-fade-up font-display text-4xl text-cream sm:text-5xl lg:text-6xl" style={{ animationDelay: "80ms" }}>
            {world?.name}
          </h1>
          <p className="mt-4 max-w-md animate-fade-up text-base text-cream/85" style={{ animationDelay: "160ms" }}>
            {isPet ? "Everything your best friend deserves — engraved tags and comfy shirts, made with love." : "Everyday lifestyle goods designed to move with you, from morning coffee to evening walks."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Categories" title="Browse the collection" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {subs.map((c, i) => {
            const imgSrc = adminCatImages[c.slug] ? mediaUrl(adminCatImages[c.slug]) : c.image || catImage(c.slug);
            return (
              <Link key={c.id} to={`/category/${c.slug}`} data-testid={`world-cat-${c.slug}`} className="group relative animate-fade-up overflow-hidden bg-oat" style={{ animationDelay: `${i * 50}ms` }}>
                <img src={imgSrc} alt={c.name} className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" onError={(e) => { e.target.src = catImage(c.slug); }} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                <div className="absolute bottom-0 flex w-full items-center justify-between p-4">
                  <span className="font-display text-lg text-cream">{c.name}</span>
                  <ArrowRight className="h-4 w-4 text-cream transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Fresh in this world" title="Featured products" />
        {loading ? <ProductGridSkeleton /> : error ? <ErrorState onRetry={reload} /> : items.length === 0 ? (
          <EmptyState title="No products yet" message="Products added to these categories in WooCommerce will appear here automatically." />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </section>
    </>
  );
}
