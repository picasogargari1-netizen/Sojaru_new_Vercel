import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Tag, CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { orders as ordersApi, apiErr } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageMeta } from "@/hooks/usePageMeta";

const COUNTRIES = [
  { code: "IN", name: "India" }, { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" }, { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }, { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
];

// Load Razorpay Checkout script once
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  usePageMeta({ title: "Checkout — Sojaru" });
  const { items, subtotal, clear } = useCart();
  const { money } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: user?.email || "", first_name: user?.first_name || "", last_name: user?.last_name || "",
    phone: "", address_1: "", city: "", state: "", postcode: "", country: "IN", note: "",
  });
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => { setForm((f) => ({ ...f, email: user?.email || f.email, first_name: user?.first_name || f.first_name, last_name: user?.last_name || f.last_name })); }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  const discount = (() => {
    if (!applied) return 0;
    const amt = Number(applied.amount || 0);
    if (applied.discount_type === "percent") return (subtotal * amt) / 100;
    return Math.min(amt, subtotal);
  })();
  const shipping = subtotal >= 1499 || subtotal === 0 ? 0 : 99;
  const total = Math.max(0, subtotal - discount) + shipping;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    try {
      const c = await ordersApi.validateCoupon(coupon.trim());
      setApplied(c);
      toast.success("Coupon applied", { description: c.code.toUpperCase() });
    } catch (e) {
      setApplied(null);
      toast.error(apiErr(e, "Invalid coupon code"));
    } finally { setCouponLoading(false); }
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    for (const k of ["email", "first_name", "last_name", "address_1", "city", "postcode"]) {
      if (!form[k].trim()) { toast.error("Please complete all required fields"); return; }
    }
    setPlacing(true);
    const address = {
      first_name: form.first_name, last_name: form.last_name, address_1: form.address_1,
      city: form.city, state: form.state, postcode: form.postcode, country: form.country,
      email: form.email, phone: form.phone,
    };
    try {
      const order = await ordersApi.create({
        line_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity, variation_id: i.variationId || undefined })),
        billing: address, shipping: address, customer_note: form.note,
        coupon_lines: applied ? [{ code: applied.code }] : [],
        shipping_lines: [shipping > 0
          ? { method_id: "flat_rate", method_title: "Flat rate", total: String(shipping) }
          : { method_id: "free_shipping", method_title: "Free shipping", total: "0" }],
      });

      if (!order.razorpay_order_id || !order.razorpay_key_id) {
        toast.error("Payment gateway is not available right now. Please try again later.");
        setPlacing(false);
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) {
        toast.error("Could not load the payment gateway. Check your connection and retry.");
        setPlacing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.razorpay_amount,
        currency: order.currency || "INR",
        name: "Sojaru",
        description: `Order #${order.id}`,
        order_id: order.razorpay_order_id,
        prefill: {
          name: `${form.first_name} ${form.last_name}`.trim(),
          email: form.email,
          contact: form.phone,
        },
        theme: { color: "#1A1715" },
        handler: async (resp) => {
          try {
            const verified = await ordersApi.verifyPayment({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              wc_order_id: order.id,
            });
            clear();
            setConfirmed(verified);
            window.scrollTo({ top: 0 });
          } catch (err) {
            toast.error(apiErr(err, "We received your payment but couldn't confirm it. Please contact support."));
          } finally { setPlacing(false); }
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            toast("Payment cancelled", { description: "Your order is saved but not yet paid." });
          },
        },
      });
      rzp.on("payment.failed", (r) => {
        setPlacing(false);
        toast.error(r?.error?.description || "Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      toast.error(apiErr(err, "We couldn't place your order. Please try again."));
      setPlacing(false);
    }
  };

  if (confirmed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6" data-testid="order-confirmation">
        <CheckCircle2 className="mx-auto h-16 w-16 text-matcha" strokeWidth={1.5} />
        <h1 className="mt-6 font-display text-4xl font-semibold text-ink">Thank you!</h1>
        <p className="mt-3 text-muted-foreground">Your Sojaru order <span className="font-mono font-semibold text-ink">#{confirmed.id}</span> has been received. You and your best friend are going to love it.</p>
        <div className="mt-6 bg-oat/60 p-6 text-left">
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Order total</span><span className="font-mono text-lg font-semibold text-ink">{money(confirmed.total)}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">Payment status: Paid · {confirmed.status}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="h-12 border border-ink px-7"><Link to="/">Continue shopping</Link></Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Your payment was processed securely by Razorpay. A confirmation email is on its way.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-matcha" strokeWidth={1.5} />
        <h1 className="mt-5 font-display text-3xl text-ink">Your bag is empty</h1>
        <p className="mt-2 text-muted-foreground">Add something lovely before checking out.</p>
        <Button asChild className="mt-6 bg-ink text-cream hover:bg-terracotta"><Link to="/">Start shopping</Link></Button>
      </div>
    );
  }

  const field = "mt-1.5 border-border bg-cream";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink">Contact</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={set("email")} className={field} data-testid="checkout-email" /></div>
              <div><Label>First name *</Label><Input value={form.first_name} onChange={set("first_name")} className={field} data-testid="checkout-firstname" /></div>
              <div><Label>Last name *</Label><Input value={form.last_name} onChange={set("last_name")} className={field} data-testid="checkout-lastname" /></div>
              <div className="sm:col-span-2"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} className={field} data-testid="checkout-phone" /></div>
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink">Shipping address</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Address *</Label><Input value={form.address_1} onChange={set("address_1")} className={field} data-testid="checkout-address" /></div>
              <div><Label>City *</Label><Input value={form.city} onChange={set("city")} className={field} data-testid="checkout-city" /></div>
              <div><Label>State / Region</Label><Input value={form.state} onChange={set("state")} className={field} data-testid="checkout-state" /></div>
              <div><Label>Postcode *</Label><Input value={form.postcode} onChange={set("postcode")} className={field} data-testid="checkout-postcode" /></div>
              <div>
                <Label>Country</Label>
                <Select value={form.country} onValueChange={set("country")}>
                  <SelectTrigger className={field} data-testid="checkout-country"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Order note (optional)</Label><Input value={form.note} onChange={set("note")} placeholder="Personalise a gift, delivery instructions..." className={field} data-testid="checkout-note" /></div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-28 border border-border bg-oat/40 p-6">
            <h2 className="font-display text-xl font-semibold text-ink">Order summary</h2>
            <div className="mt-4 max-h-64 space-y-4 overflow-y-auto">
              {items.map((i) => (
                <div key={i.key} className="flex gap-3">
                  <div className="relative shrink-0">
                    <img src={i.image} alt={i.name} className="h-16 w-14 rounded-lg object-cover" />
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[0.65rem] font-bold text-cream">{i.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{i.name}</p>
                    {i.variantLabel && <p className="text-xs text-muted-foreground">{i.variantLabel}</p>}
                  </div>
                  <span className="font-mono text-sm text-ink">{money(Number(i.price) * i.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="border-border bg-cream pl-9" data-testid="checkout-coupon-input" />
              </div>
              <Button type="button" onClick={applyCoupon} disabled={couponLoading} variant="outline" className="border-ink" data-testid="checkout-coupon-apply">
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono text-ink">{money(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-matcha"><span>Discount ({applied.code})</span><span className="font-mono">−{money(discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-mono text-ink">{shipping === 0 ? "Free" : money(shipping)}</span></div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span className="text-ink">Total</span><span className="font-mono text-ink" data-testid="checkout-total">{money(total)}</span></div>
            </div>

            <Button type="submit" disabled={placing} className="mt-5 h-12 w-full bg-ink text-base font-semibold text-cream transition-all hover:bg-terracotta" data-testid="place-order-button">
              {placing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Lock className="mr-2 h-4 w-4" /> Pay securely</>}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Secured by Razorpay</p>
          </div>
        </div>
      </form>
    </div>
  );
}
