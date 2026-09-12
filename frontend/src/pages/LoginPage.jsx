import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, PawPrint } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiErr, auth as authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function LoginPage() {
  usePageMeta({ title: "Log in — Sojaru" });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Forgot-password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success("Welcome back!");
      navigate("/account");
    } catch (err) {
      toast.error(apiErr(err, "Invalid email or password"));
    } finally { setLoading(false); }
  };

  const openForgot = () => {
    setForgotEmail(form.email || "");
    setForgotMsg("");
    setForgotOpen(true);
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotMsg("");
    try {
      const r = await authApi.forgotPassword(forgotEmail.trim());
      setForgotMsg(r.message || "If an account with that email exists, a temporary password has been sent to it.");
    } catch (err) {
      setForgotMsg(apiErr(err, "Something went wrong. Please try again."));
    } finally { setForgotLoading(false); }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
      <div className="text-center">
        <PawPrint className="mx-auto h-8 w-8 text-terracotta" />
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Log in to track orders and manage your account.</p>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="login-email" /></div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <button type="button" onClick={openForgot} className="text-xs font-semibold text-terracotta hover:underline" data-testid="forgot-password-link">Forgot password?</button>
          </div>
          <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="login-password" />
        </div>
        <Button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-ink text-base font-semibold text-cream hover:bg-terracotta" data-testid="login-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Sojaru? <Link to="/register" className="font-semibold text-terracotta hover:underline" data-testid="go-register">Create an account</Link>
      </p>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="bg-cream sm:max-w-md" data-testid="forgot-password-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink">Reset your password</DialogTitle>
            <DialogDescription>Enter your account email and we&apos;ll send a temporary password you can sign in with.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForgot} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="mt-1.5 rounded-xl bg-white" data-testid="forgot-email" placeholder="you@example.com" />
            </div>
            {forgotMsg && <p className="rounded-lg bg-oat/70 px-4 py-3 text-sm text-ink" data-testid="forgot-message">{forgotMsg}</p>}
            <Button type="submit" disabled={forgotLoading} className="h-11 w-full rounded-full bg-ink font-semibold text-cream hover:bg-terracotta" data-testid="forgot-submit">
              {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send temporary password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
