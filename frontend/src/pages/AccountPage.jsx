import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Package, User as UserIcon, MapPin, LogOut, PawPrint, LayoutDashboard, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { auth as authApi, apiErr } from "@/lib/api";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/States";
import { usePageMeta } from "@/hooks/usePageMeta";

const STATUS_COLORS = {
  completed: "bg-matcha/15 text-matcha", processing: "bg-amber/15 text-amber",
  pending: "bg-oat text-ink/70", "on-hold": "bg-oat text-ink/70",
  cancelled: "bg-terracotta/15 text-terracotta", refunded: "bg-terracotta/15 text-terracotta",
  failed: "bg-terracotta/15 text-terracotta",
};

function Orders() {
  const { money } = useStore();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { authApi.myOrders().then(setOrders).catch(() => setError(true)); }, []);

  if (error) return <EmptyState title="Couldn't load orders" message="Please try again shortly." />;
  if (orders === null) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-terracotta" /></div>;
  if (orders.length === 0) return <EmptyState title="No orders yet" message="When you place an order, it'll show up here with live status from WooCommerce." testid="orders-empty" />;

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} data-testid={`order-${o.id}`} className="rounded-2xl border border-border bg-cream p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="font-mono text-sm font-semibold text-ink">Order #{o.number || o.id}</p>
              <p className="text-xs text-muted-foreground">{o.date_created ? new Date(o.date_created).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_COLORS[o.status] || "bg-oat text-ink/70"}`}>{o.status}</span>
            <span className="font-mono font-semibold text-ink">{money(o.total)}</span>
          </div>
          <div className="mt-4 space-y-3">
            {o.line_items.map((li, i) => (
              <div key={i} className="flex items-center gap-3">
                {li.image ? <img src={li.image} alt={li.name} className="h-12 w-11 rounded-lg object-cover" /> : <div className="flex h-12 w-11 items-center justify-center rounded-lg bg-oat"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                <div className="flex-1 text-sm"><span className="font-medium text-ink">{li.name}</span> <span className="text-muted-foreground">× {li.quantity}</span></div>
                <span className="font-mono text-sm text-ink">{money(li.total)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ first_name: user?.first_name || "", last_name: user?.last_name || "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { const u = await authApi.updateProfile(form); setUser((p) => ({ ...p, ...u })); toast.success("Profile updated"); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  return (
    <div className="max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="profile-firstname" /></div>
        <div><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="profile-lastname" /></div>
      </div>
      <div><Label>Email</Label><Input value={user?.email} disabled className="mt-1.5 rounded-xl bg-oat" /></div>
      <Button onClick={save} disabled={saving} className="rounded-full bg-ink text-cream hover:bg-terracotta" data-testid="profile-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}</Button>
    </div>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.current_password || !form.new_password) { toast.error("Please fill in all fields."); return; }
    if (form.new_password.length < 6) { toast.error("New password must be at least 6 characters."); return; }
    if (form.new_password !== form.confirm_password) { toast.error("New passwords do not match."); return; }
    setSaving(true);
    try {
      await authApi.changePassword({ current_password: form.current_password, new_password: form.new_password });
      toast.success("Password updated successfully");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (e) { toast.error(apiErr(e, "Could not change password")); }
    finally { setSaving(false); }
  };
  return (
    <div className="max-w-md space-y-4" data-testid="change-password-form">
      <div><Label>Current password</Label><Input type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="cp-current" /></div>
      <div><Label>New password</Label><Input type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="cp-new" /></div>
      <div><Label>Confirm new password</Label><Input type="password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="cp-confirm" /></div>
      <Button onClick={save} disabled={saving} className="rounded-full bg-ink text-cream hover:bg-terracotta" data-testid="cp-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}</Button>
    </div>
  );
}

function Addresses() {
  const { user, setUser } = useAuth();
  const b = user?.billing || {};
  const [form, setForm] = useState({ address_1: b.address_1 || "", city: b.city || "", state: b.state || "", postcode: b.postcode || "", country: b.country || "IN", phone: b.phone || "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    setSaving(true);
    const payload = { ...form, first_name: user?.first_name, last_name: user?.last_name, email: user?.email };
    try { const u = await authApi.updateProfile({ billing: payload, shipping: payload }); setUser((p) => ({ ...p, ...u })); toast.success("Address saved"); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  return (
    <div className="max-w-md space-y-4">
      <div><Label>Address</Label><Input value={form.address_1} onChange={set("address_1")} className="mt-1.5 rounded-xl bg-cream" data-testid="address-line" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>City</Label><Input value={form.city} onChange={set("city")} className="mt-1.5 rounded-xl bg-cream" /></div>
        <div><Label>State</Label><Input value={form.state} onChange={set("state")} className="mt-1.5 rounded-xl bg-cream" /></div>
        <div><Label>Postcode</Label><Input value={form.postcode} onChange={set("postcode")} className="mt-1.5 rounded-xl bg-cream" /></div>
        <div><Label>Country</Label><Input value={form.country} onChange={set("country")} className="mt-1.5 rounded-xl bg-cream" /></div>
      </div>
      <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} className="mt-1.5 rounded-xl bg-cream" /></div>
      <Button onClick={save} disabled={saving} className="rounded-full bg-ink text-cream hover:bg-terracotta" data-testid="address-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save address"}</Button>
    </div>
  );
}

export default function AccountPage() {
  usePageMeta({ title: "My Account — Sojaru" });
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (ready && !user) navigate("/login"); }, [ready, user, navigate]);
  if (!ready || !user) return <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-terracotta" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-terracotta">My Account</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Hi, {user.first_name || "friend"} <PawPrint className="inline h-7 w-7 text-terracotta" /></h1>
        </div>
        <div className="flex items-center gap-3">
          {user.is_admin && (
            <Button asChild className="rounded-full bg-ink font-bold text-cream hover:bg-terracotta" data-testid="account-admin-link">
              <Link to="/admin"><LayoutDashboard className="mr-2 h-4 w-4" /> Storefront Manager</Link>
            </Button>
          )}
          <Button onClick={() => { logout(); navigate("/"); }} variant="outline" className="rounded-full border-ink" data-testid="logout-button"><LogOut className="mr-2 h-4 w-4" /> Log out</Button>
        </div>
      </div>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-full bg-oat p-1">
          <TabsTrigger value="orders" className="rounded-full data-[state=active]:bg-cream" data-testid="tab-orders"><Package className="mr-2 h-4 w-4" /> Orders</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-full data-[state=active]:bg-cream" data-testid="tab-profile"><UserIcon className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="addresses" className="rounded-full data-[state=active]:bg-cream" data-testid="tab-addresses"><MapPin className="mr-2 h-4 w-4" /> Addresses</TabsTrigger>
          <TabsTrigger value="password" className="rounded-full data-[state=active]:bg-cream" data-testid="tab-password"><Lock className="mr-2 h-4 w-4" /> Password</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="profile"><Profile /></TabsContent>
        <TabsContent value="addresses"><Addresses /></TabsContent>
        <TabsContent value="password"><ChangePassword /></TabsContent>
      </Tabs>
    </div>
  );
}
