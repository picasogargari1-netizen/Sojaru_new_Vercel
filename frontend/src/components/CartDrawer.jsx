import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, X, ShoppingBag, ArrowRight, PawPrint } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";

export function CartDrawer() {
  const { items, open, setOpen, removeItem, updateQty, subtotal, count } = useCart();
  const { money, delivery } = useStore();
  const navigate = useNavigate();
  const FREE_SHIP = delivery.free_above;
  const remaining = Math.max(0, FREE_SHIP - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIP) * 100);

  const checkout = () => { setOpen(false); navigate("/checkout"); };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-[92vw] max-w-md flex-col gap-0 bg-cream p-0" data-testid="cart-drawer">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl text-ink">Your Bag {count > 0 && `(${count})`}</h2>
          <SheetTitle className="sr-only">Shopping bag</SheetTitle>
          <button onClick={() => setOpen(false)} aria-label="Close cart" data-testid="cart-close"><X className="h-5 w-5 text-ink" /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" data-testid="cart-empty">
            <div className="flex h-16 w-16 items-center justify-center bg-oat">
              <ShoppingBag className="h-7 w-7 text-matcha" strokeWidth={1.5} />
            </div>
            <h3 className="mt-5 font-display text-2xl text-ink">Your bag is empty</h3>
            <p className="mt-2 text-sm text-muted-foreground">Let's find something for you and your best friend.</p>
            <Button onClick={() => setOpen(false)} className="mt-6 bg-ink text-cream hover:bg-terracotta" data-testid="cart-continue-shopping">
              Continue shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink">
                <PawPrint className="h-4 w-4 text-terracotta" />
                {remaining > 0 ? (
                  <span>You're <b>{money(remaining)}</b> away from free shipping</span>
                ) : (
                  <span className="font-semibold text-matcha">You've unlocked free shipping!</span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden bg-oat">
                <div className="h-full bg-matcha transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.map((it) => (
                <div key={it.key} data-testid={`cart-item-${it.key}`} className="flex gap-4 border-b border-border py-4 last:border-0">
                  <Link to={`/product/${it.slug}`} onClick={() => setOpen(false)} className="shrink-0">
                    <img src={it.image} alt={it.name} className="h-24 w-20 object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <Link to={`/product/${it.slug}`} onClick={() => setOpen(false)} className="text-sm font-semibold text-ink line-clamp-2">{it.name}</Link>
                      <button onClick={() => removeItem(it.key)} aria-label="Remove" data-testid={`cart-remove-${it.key}`} className="text-muted-foreground hover:text-terracotta"><X className="h-4 w-4" /></button>
                    </div>
                    {it.variantLabel && <p className="mt-0.5 text-xs text-muted-foreground">{it.variantLabel}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center border border-border">
                        <button onClick={() => updateQty(it.key, it.quantity - 1)} className="p-1.5" aria-label="Decrease" data-testid={`cart-dec-${it.key}`}><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center font-mono text-sm">{it.quantity}</span>
                        <button onClick={() => updateQty(it.key, it.quantity + 1)} className="p-1.5" aria-label="Increase" data-testid={`cart-inc-${it.key}`}><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="font-mono text-sm font-semibold text-ink">{money(Number(it.price) * it.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border bg-oat/40 px-5 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono text-lg font-semibold text-ink" data-testid="cart-subtotal">{money(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Shipping & taxes calculated at checkout.</p>
              <Button onClick={checkout} data-testid="cart-drawer-checkout-button" className="mt-4 h-12 w-full bg-ink text-base font-semibold text-cream transition-all hover:bg-terracotta">
                Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button onClick={() => setOpen(false)} className="mt-3 w-full text-center text-sm font-medium text-ink underline-offset-4 hover:underline">
                Continue shopping
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
