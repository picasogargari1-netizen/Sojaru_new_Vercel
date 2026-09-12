import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, ShoppingBag, Menu, ChevronRight, X, LayoutDashboard } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SearchDialog } from "@/components/SearchDialog";

const marqueeItems = [
  "Free shipping over ₹1,499",
  "Curated for you & your best friend",
  "New season, new arrivals",
  "Handmade pet tags, engraved with love",
  "Made in India, with love",
];

function MegaMenu({ world, subcats, onNavigate }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-40 w-[min(760px,92vw)] -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
      <div className="overflow-hidden border border-border bg-cream/95 p-2 shadow-lg backdrop-blur-md">
        <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3">
          {subcats.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              onClick={onNavigate}
              data-testid={`mega-link-${c.slug}`}
              className="flex items-center justify-between px-4 py-3 text-sm text-ink/70 transition-colors hover:bg-oat hover:text-ink"
            >
              {c.name}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
        <Link
          to={`/shop/${world.slug}`}
          onClick={onNavigate}
          className="flex items-center justify-between bg-ink px-4 py-3 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
        >
          Shop all {world.name}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function Header() {
  const { forYou, forPet, childrenOf, settings } = useStore();
  const { count, setOpen } = useCart();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  const forYouSubs = forYou ? childrenOf(forYou.id) : [];
  const forPetSubs = forPet ? childrenOf(forPet.id) : [];
  const marquee = settings?.marquee_texts?.length ? settings.marquee_texts : marqueeItems;

  const navLink = "relative py-2 text-sm text-ink/70 transition-colors hover:text-ink";

  return (
    <>
      {/* Announcement Marquee — light warm band like hyppy */}
      <div className="overflow-hidden border-b border-border bg-softyellow">
        <div className="flex whitespace-nowrap py-2.5 animate-marquee">
          {[...marquee, ...marquee, ...marquee, ...marquee].map((t, i) => (
            <span
              key={i}
              className="mx-8 flex items-center gap-3 text-[0.8rem] italic text-ink/50"
              style={{ fontFamily: '"DM Serif Display", serif' }}
            >
              {t} <span className="not-italic text-ink/30">✿</span>
            </span>
          ))}
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button data-testid="mobile-menu-trigger" aria-label="Open menu" className="p-1">
                  <Menu className="h-5 w-5 text-ink" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto bg-cream p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex items-center justify-between border-b border-border p-5">
                  <img src="/sojaru-logo.png" alt="Sojaru" className="h-9 w-auto" />
                  <button onClick={() => setMobileOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
                </div>
                <MobileNav
                  forYou={forYou} forPet={forPet}
                  forYouSubs={forYouSubs} forPetSubs={forPetSubs}
                  close={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>

          <Link to="/" data-testid="logo-link" className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
            <img src="/sojaru-logo.png" alt="Sojaru" className="h-10 w-auto sm:h-11" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            <Link to="/" className={navLink} data-testid="nav-home">Home</Link>
            <div className="group relative">
              <Link to={forYou ? `/shop/${forYou.slug}` : "/"} className={`${navLink} flex items-center gap-1`} data-testid="nav-for-you">
                For You
              </Link>
              {forYou && <MegaMenu world={forYou} subcats={forYouSubs} onNavigate={() => {}} />}
            </div>
            <div className="group relative">
              <Link to={forPet ? `/shop/${forPet.slug}` : "/"} className={`${navLink} flex items-center gap-1`} data-testid="nav-for-pet">
                For Your Pet
              </Link>
              {forPet && <MegaMenu world={forPet} subcats={forPetSubs} onNavigate={() => {}} />}
            </div>
            <Link to="/category/new-arrivals" className={navLink} data-testid="nav-new-arrivals">New Arrivals</Link>
            <Link to="/category/gifting" className={navLink} data-testid="nav-gifting">Gifting</Link>
            <Link to="/contact" className={navLink} data-testid="nav-contact">Contact</Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button data-testid="header-search-button" aria-label="Search" onClick={() => setSearchOpen(true)} className="rounded-full p-2 text-ink/60 transition-colors hover:bg-oat hover:text-ink">
              <Search className="h-[1.1rem] w-[1.1rem]" />
            </button>
            {user?.is_admin && (
              <Link to="/admin" data-testid="header-admin-button" aria-label="Admin dashboard" title="Storefront Manager" className="rounded-full p-2 text-ink/60 transition-colors hover:bg-oat hover:text-ink">
                <LayoutDashboard className="h-[1.1rem] w-[1.1rem]" />
              </Link>
            )}
            <Link to={user ? "/account" : "/login"} data-testid="header-account-button" aria-label="Account" className="rounded-full p-2 text-ink/60 transition-colors hover:bg-oat hover:text-ink">
              <User className="h-[1.1rem] w-[1.1rem]" />
            </Link>
            <button data-testid="header-cart-button" aria-label="Cart" onClick={() => setOpen(true)} className="relative rounded-full p-2 text-ink/60 transition-colors hover:bg-oat hover:text-ink">
              <ShoppingBag className="h-[1.1rem] w-[1.1rem]" />
              {count > 0 && (
                <span data-testid="cart-count-badge" className="absolute -right-0.5 -top-0.5 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-terracotta px-1 text-[0.62rem] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MobileNavGroup({ world, subs, id, section, setSection, go }) {
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setSection(section === id ? null : id)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-ink"
        data-testid={`mobile-group-${id}`}
      >
        {world?.name}
        <ChevronRight className={`h-4 w-4 transition-transform ${section === id ? "rotate-90" : ""}`} />
      </button>
      {section === id && (
        <div className="bg-oat/50 pb-2">
          <button onClick={() => go(`/shop/${world.slug}`)} className="block w-full px-8 py-2.5 text-left text-sm font-medium text-terracotta">
            Shop all {world.name}
          </button>
          {subs.map((c) => (
            <button key={c.id} onClick={() => go(`/category/${c.slug}`)} className="block w-full px-8 py-2.5 text-left text-sm text-ink/70" data-testid={`mobile-link-${c.slug}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileNav({ forYou, forPet, forYouSubs, forPetSubs, close }) {
  const [section, setSection] = useState(null);
  const navigate = useNavigate();
  const go = (path) => { close(); navigate(path); };
  return (
    <div className="pb-10">
      <button onClick={() => go("/")} className="block w-full border-b border-border px-5 py-4 text-left text-sm font-medium text-ink">Home</button>
      {forYou && <MobileNavGroup world={forYou} subs={forYouSubs} id="you" section={section} setSection={setSection} go={go} />}
      {forPet && <MobileNavGroup world={forPet} subs={forPetSubs} id="pet" section={section} setSection={setSection} go={go} />}
      <button onClick={() => go("/category/new-arrivals")} className="block w-full border-b border-border px-5 py-4 text-left text-sm font-medium text-ink">New Arrivals</button>
      <button onClick={() => go("/category/gifting")} className="block w-full border-b border-border px-5 py-4 text-left text-sm font-medium text-ink">Gifting</button>
      <button onClick={() => go("/contact")} className="block w-full border-b border-border px-5 py-4 text-left text-sm font-medium text-ink">Contact</button>
    </div>
  );
}
