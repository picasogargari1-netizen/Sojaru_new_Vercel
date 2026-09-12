import { useState } from "react";
import { toast } from "sonner";
import { PawPrint, Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { store, apiErr } from "@/lib/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IMAGES } from "@/lib/assets";
import { usePageMeta } from "@/hooks/usePageMeta";

const FAQS = [
  ["How long does shipping take?", "Orders ship within 1–2 business days and typically arrive across India in 3–7 business days. Free standard shipping on orders over ₹1,499."],
  ["Are your pet tags customisable?", "Yes! Our brass and enamel tags are engraved to order with your pet's name and your contact details. Add engraving notes at checkout."],
  ["What's your return policy?", "Return unworn items within 30 days for a full refund. Made-to-order engraved tags are non-returnable unless faulty."],
  ["Do the human and pet items really match?", "They do. Our Everyday Tee and Matchy Dog Tee are designed as a set, so you and your best friend can twin in style."],
  ["How do I track my order?", "Create an account and head to My Account → Orders to see live status pulled straight from our store."],
];

const CONTENT = {
  about: {
    title: "Our Story",
    eyebrow: "About Sojaru",
    render: () => (
      <div className="space-y-8">
        <div className="overflow-hidden rounded-[1.6rem] bg-oat">
          <img src={IMAGES.hero} alt="Sojaru lifestyle" className="aspect-[16/9] w-full object-cover" />
        </div>
        <div className="prose prose-lg max-w-none">
          <p className="text-lg leading-relaxed text-ink/80">Sojaru began with a simple belief: the little rituals we share with the ones we love — including the four-legged ones — deserve beautiful things.</p>
          <p className="text-base leading-relaxed text-muted-foreground">We design lifestyle goods for people <em>and</em> their pets. From buttery organic tees and hand-glazed drinkware to engraved brass tags and matchy dog shirts, everything we make is built around one idea: <strong>for you and your best friend.</strong></p>
          <p className="text-base leading-relaxed text-muted-foreground">We keep our range tight and considered, work with makers who care, and choose materials that are kind to the planet. No clutter, no throwaway trends — just pieces you'll reach for again and again.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[["Considered", "Small, curated collections made to last."], ["Playful", "Joyful design for humans and pets alike."], ["Kind", "Sustainable materials and makers we trust."]].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-oat/60 p-6">
              <PawPrint className="h-6 w-6 text-terracotta" />
              <h3 className="mt-3 font-display text-xl text-ink">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  contact: { title: "Contact Us", eyebrow: "We'd love to hear from you", render: () => <ContactForm /> },
  faq: {
    title: "Frequently Asked Questions", eyebrow: "Help & FAQ",
    render: () => (
      <Accordion type="single" collapsible className="max-w-2xl">
        {FAQS.map(([q, a], i) => (
          <AccordionItem key={i} value={`f${i}`}>
            <AccordionTrigger className="text-left text-base font-semibold" data-testid={`faq-${i}`}>{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    ),
  },
  "shipping-returns": {
    title: "Shipping & Returns", eyebrow: "The details",
    render: () => (
      <div className="max-w-2xl space-y-6 text-muted-foreground">
        <div><h3 className="font-display text-xl text-ink">Shipping</h3><p className="mt-2">We offer free standard shipping on all orders over ₹1,499. Orders under ₹1,499 ship at a flat ₹99. Orders are dispatched within 1–2 business days and delivered across India within 3–7 business days. Tracking is emailed as soon as your parcel is on its way.</p></div>
        <div><h3 className="font-display text-xl text-ink">Returns</h3><p className="mt-2">If something isn't quite right, return unworn items in their original condition within 30 days for a full refund. Engraved pet tags are made to order and can only be returned if faulty. Start a return by contacting us with your order number.</p></div>
      </div>
    ),
  },
  privacy: {
    title: "Privacy Policy", eyebrow: "Your data",
    render: () => (
      <div className="max-w-2xl space-y-4 text-muted-foreground">
        <p>We respect your privacy. Sojaru collects only the information needed to process your orders and improve your experience — your name, contact details, and order history.</p>
        <p>We never sell your data. Payment information is handled securely by our payment providers and is never stored on our servers. You can request access to or deletion of your data at any time by contacting us.</p>
      </div>
    ),
  },
  terms: {
    title: "Terms & Conditions", eyebrow: "The fine print",
    render: () => (
      <div className="max-w-2xl space-y-4 text-muted-foreground">
        <p>By using the Sojaru website and placing an order, you agree to these terms. All products are subject to availability, and prices may change without notice.</p>
        <p>All content, imagery and branding on this site belongs to Sojaru and may not be reproduced without permission. Orders are governed by the laws applicable in our operating region.</p>
      </div>
    ),
  },
};

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await store.contact(form);
      toast.success("Message sent!", { description: "We'll get back to you within 1–2 business days." });
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error(apiErr(err, "Could not send your message. Please try again."));
    } finally { setSending(false); }
  };
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4">
        <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="contact-name" /></div>
        <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="contact-email" /></div>
        <div><Label>Message</Label><Textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-1.5 rounded-xl bg-cream" data-testid="contact-message" /></div>
        <Button type="submit" disabled={sending} className="rounded-full bg-ink text-cream hover:bg-terracotta" data-testid="contact-submit">{sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : "Send message"}</Button>
      </form>
      <div className="space-y-5 rounded-2xl bg-oat/60 p-7" data-testid="reach-the-pack">
        <h3 className="font-display text-2xl text-ink">Reach the pack</h3>
        <p className="flex items-center gap-3 text-sm text-ink/80"><Mail className="h-5 w-5 text-terracotta" /> hello@sojaru.co.in</p>
        <p className="flex items-center gap-3 text-sm text-ink/80"><Phone className="h-5 w-5 text-terracotta" /> <a href="tel:+919477909496" className="hover:text-terracotta">+91 94779 09496</a></p>
        <p className="flex items-center gap-3 text-sm text-ink/80"><MapPin className="h-5 w-5 text-terracotta" /> Shipping across India</p>
        <p className="text-sm text-muted-foreground">Whether it's a question about sizing, an engraving request, or you just want to share a photo of your best friend — we're all ears.</p>
      </div>
    </div>
  );
}

export default function InfoPage({ page }) {
  const data = CONTENT[page] || CONTENT.about;
  usePageMeta({ title: `${data.title} — Sojaru` });
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="eyebrow text-terracotta">{data.eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{data.title}</h1>
      <div className="mt-10">{data.render()}</div>
    </div>
  );
}
