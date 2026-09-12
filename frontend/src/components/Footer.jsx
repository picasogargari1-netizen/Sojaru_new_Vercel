import { useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Facebook, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/StoreContext";

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="eyebrow mb-4 text-ink/40">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="text-sm text-ink/60 transition-colors hover:text-ink">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { forYou, forPet, childrenOf } = useStore();
  const [email, setEmail] = useState("");
  const forYouSubs = forYou ? childrenOf(forYou.id) : [];
  const forPetSubs = forPet ? childrenOf(forPet.id) : [];

  const subscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Welcome to the pack!", { description: "You're on the list for Sojaru news & drops." });
    setEmail("");
  };

  return (
    <footer className="mt-20 border-t border-border bg-oat/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <img src="/sojaru-logo.png" alt="Sojaru" className="h-14 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/55">
              Lifestyle goods designed for you and your best friend. Thoughtfully made, joyfully worn — by both of you.
            </p>
            <form onSubmit={subscribe} className="mt-6 max-w-sm">
              <label className="text-xs font-medium uppercase tracking-wider text-ink/50">Join the pack</label>
              <div className="mt-2 flex items-center overflow-hidden border border-border bg-cream">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Your email address"
                  data-testid="newsletter-input"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-ink/30"
                />
                <button type="submit" data-testid="newsletter-submit" aria-label="Subscribe" className="m-1 flex h-9 w-10 items-center justify-center bg-ink text-cream transition-colors hover:bg-terracotta">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: Instagram, href: "https://www.instagram.com/sojaru.customs?stkn=MWM2enR3ZmFxbTkxNA==", label: "Instagram" },
                { Icon: Facebook, href: "https://www.facebook.com/share/1EztS1bNT7/?mibextid=wwXIfr", label: "Facebook" },
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} data-testid={`footer-social-${label.toLowerCase()}`} className="flex h-8 w-8 items-center justify-center border border-border text-ink/40 transition-colors hover:border-ink hover:text-ink">
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            <FooterCol title="Shop" links={[
              { to: "/shop/for-you", label: "For You" },
              { to: "/shop/for-your-pet", label: "For Your Pet" },
              { to: "/category/new-arrivals", label: "New Arrivals" },
              { to: "/category/featured-collection", label: "Featured" },
              { to: "/category/on-sale", label: "On Sale" },
              { to: "/category/best-sellers", label: "Best Sellers" },
              { to: "/category/gifting", label: "Gifting" },
            ]} />
            <FooterCol title="For You" links={forYouSubs.map((c) => ({ to: `/category/${c.slug}`, label: c.name }))} />
            <FooterCol title="For Your Pet" links={forPetSubs.map((c) => ({ to: `/category/${c.slug}`, label: c.name }))} />
            <FooterCol title="Information" links={[
              { to: "/contact", label: "Contact" },
              { to: "/shipping-returns", label: "Shipping & Returns" },
              { to: "/privacy", label: "Privacy Policy" },
              { to: "/terms", label: "Terms & Conditions" },
            ]} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-ink/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Sojaru. Made for you & your best friend.</p>
        </div>
      </div>
    </footer>
  );
}
