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
    title: "Terms & Conditions", eyebrow: "Last Updated: 14 September 2026",
    render: () => <TermsContent />,
  },
};

function TermsContent() {
  return (
    <div className="max-w-3xl space-y-8 text-ink/80" data-testid="terms-content">
      <p className="text-base leading-relaxed">Welcome to Sojaru. These Terms &amp; Conditions ("Terms") govern your access to and use of the Sojaru website, www.sojaru.co.in ("Website"), and your purchase of products through the Website.</p>
      <p className="text-base leading-relaxed">By accessing or using the Website, placing an order, or purchasing any product from us, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please do not use the Website.</p>

      <Section n="1" title="About Sojaru">
        <P>Sojaru ("Sojaru", "we", "us", or "our") operates the Website and offers original merchandise, including apparel, mugs, notebooks and other products, as well as customizable products made according to customer-provided designs, artwork, images, text or instructions.</P>
        <P>Our products may be sold under the Sojaru brand and may include designs created by us or customized according to customer requirements.</P>
      </Section>

      <Section n="2" title="Eligibility">
        <P>By using the Website, you confirm that:</P>
        <List items={[
          "You are legally capable of entering into a binding agreement under applicable law.",
          "The information you provide to us is accurate and complete.",
          "You will use the Website only for lawful purposes.",
          "You will not use the Website to infringe the rights of any person or entity.",
        ]} />
        <P>If you are under the age of 18, you should use the Website and place orders only with the involvement and consent of a parent or legal guardian.</P>
      </Section>

      <Section n="3" title="Products and Product Information">
        <P>We make reasonable efforts to ensure that product descriptions, images, colours, specifications, dimensions and other information displayed on the Website are accurate. However:</P>
        <List items={[
          "Actual colours may vary depending on your device or screen settings.",
          "Product images may be for illustrative purposes.",
          "Minor variations in colour, print placement, texture or appearance may occur as a result of the manufacturing and printing process.",
          "Product availability may change without prior notice.",
        ]} />
        <P>We reserve the right to correct errors, inaccuracies or omissions and to update product information at any time.</P>
      </Section>

      <Section n="4" title="Customized Products">
        <P>Sojaru accepts customized orders where customers may provide designs, images, artwork, text, logos or other instructions for printing or personalization.</P>
        <P>By submitting any content for customization, you represent and warrant that:</P>
        <List items={[
          "You own the content or have all necessary rights, licences and permissions to use it.",
          "Your submission does not infringe any copyright, trademark, design right, privacy right, publicity right or other legal right of any third party.",
          "Your submission does not contain unlawful, defamatory, hateful, threatening, obscene or otherwise objectionable material.",
          "You have obtained any necessary consent from individuals whose photographs or personal information are included in the submitted content.",
          "You grant Sojaru a limited right to use the submitted content solely to process, produce and fulfil your order.",
        ]} />
        <P>We may refuse to produce or fulfil any customization request that we reasonably believe may violate applicable law or third-party rights.</P>
        <P>Sojaru is not responsible for determining whether a customer's submitted design is legally protected or whether the customer has obtained the necessary rights or permissions.</P>
      </Section>

      <Section n="5" title="Intellectual Property">
        <P>All content on the Website, including but not limited to:</P>
        <List items={[
          "Sojaru's name and branding; logos; original artwork and designs; product photographs; graphics; illustrations; website layout and design; text and written content; and other materials created or provided by Sojaru",
        ]} />
        <P>are owned by or licensed to Sojaru and are protected under applicable intellectual property laws.</P>
        <P>You may not reproduce, copy, modify, distribute, sell, publish, commercially exploit or otherwise use our content without our prior written permission.</P>
        <P>For customized products, the customer retains responsibility for the rights associated with content supplied by the customer. Providing content to Sojaru does not transfer ownership of that content to Sojaru.</P>
      </Section>

      <Section n="6" title="Product Orders">
        <P>When you place an order through the Website, you are making an offer to purchase the selected products.</P>
        <P>An order is considered accepted only when we confirm the order or otherwise communicate that the order has been accepted.</P>
        <P>We reserve the right to cancel or refuse an order, including where:</P>
        <List items={[
          "a product is unavailable;",
          "there is an error in product information or pricing;",
          "the payment cannot be verified;",
          "the customer's information is incomplete or inaccurate;",
          "a customization request cannot reasonably be fulfilled;",
          "we suspect fraudulent or unauthorized activity; or",
          "circumstances beyond our reasonable control prevent fulfilment.",
        ]} />
        <P>If we cancel an order after receiving payment, the applicable amount paid for the cancelled order will be refunded through the applicable payment method, subject to applicable law.</P>
      </Section>

      <Section n="7" title="Pricing and Payments">
        <P>All prices displayed on the Website are subject to change without prior notice.</P>
        <P>Applicable taxes, shipping charges or other charges, where applicable, will be displayed during the checkout process.</P>
        <P>Payments may be processed through third-party payment service providers, including Razorpay or other payment gateways made available by us.</P>
        <P>By submitting payment information, you confirm that you are authorized to use the relevant payment method.</P>
        <P>Sojaru does not ordinarily store complete payment card information on its own servers. Payment information may be processed by the relevant third-party payment provider in accordance with its own terms and privacy policy.</P>
      </Section>

      <Section n="8" title="Customization Approval">
        <P>Where applicable, Sojaru may request confirmation or approval of a customized design before production.</P>
        <P>Once a customized order has entered production, changes to the design, text, colour, size or other specifications may not be possible.</P>
        <P>Customers are responsible for carefully reviewing the information and customization instructions submitted to us.</P>
        <P>If a customer approves a design or provides final customization instructions, Sojaru will generally rely on that approval when producing the product.</P>
      </Section>

      <Section n="9" title="Shipping and Delivery">
        <P>We aim to dispatch and deliver orders within the estimated timelines communicated on the Website or at checkout.</P>
        <P>Delivery timelines are estimates and may be affected by:</P>
        <List items={[
          "courier delays; weather conditions; public holidays; logistical disruptions; incorrect or incomplete delivery information; remote delivery locations; events beyond our reasonable control; or other circumstances affecting the delivery network.",
        ]} />
        <P>Customers are responsible for providing accurate delivery information.</P>
        <P>Sojaru shall not be responsible for delays caused by inaccurate or incomplete information supplied by the customer or circumstances beyond our reasonable control.</P>
      </Section>

      <Section n="10" title="Returns, Exchanges and Refunds">
        <P>We want you to receive your products in good condition. Our return, exchange and refund policy is as follows:</P>
        <Sub n="10.1" title="Damaged Products">
          <P>If a product is delivered to you in a damaged or defective condition, you must contact Sojaru as soon as reasonably possible after delivery and provide your order details along with clear photographs or videos of the damaged product and packaging, if requested.</P>
          <P>Where the product is verified to have been delivered damaged, Sojaru may, at its discretion and subject to availability:</P>
          <List items={["provide a replacement product; or", "issue a refund for the affected product."]} />
          <P>If a suitable replacement is unavailable, we will provide an appropriate refund.</P>
        </Sub>
        <Sub n="10.2" title="Used Products">
          <P>Products that have been used, washed, altered, modified, damaged after delivery, or otherwise handled in a manner that affects their original condition cannot be returned or exchanged.</P>
          <P>Customers should inspect their products upon delivery and contact us promptly if they identify any damage.</P>
        </Sub>
        <Sub n="10.3" title="Customized Products">
          <P>Customized or personalized products are made specifically according to the customer's requirements and therefore cannot be returned or exchanged merely because the customer changes their mind, does not like the design, selects an incorrect size, colour or specification, or is otherwise dissatisfied with the customization.</P>
          <P>Customized products will only be eligible for a replacement or refund if they are delivered damaged or defective, subject to verification by Sojaru.</P>
          <P>Customers are responsible for carefully checking the customization details, including text, images, artwork, colours, sizes and other information provided to us before the order is processed.</P>
        </Sub>
        <Sub n="10.4" title="No Return or Refund for Change of Mind">
          <P>We do not accept returns, exchanges or refunds simply because a customer changes their mind, no longer requires the product, dislikes the design, or orders an incorrect size or specification, except where required by applicable law.</P>
        </Sub>
        <Sub n="10.5" title="Verification">
          <P>Sojaru may request photographs, videos, packaging details, delivery information or other reasonable evidence to verify a claim of damage or defect.</P>
          <P>We reserve the right to reject a return, replacement or refund request where the product is found to have been damaged after delivery, used, altered, washed, mishandled or otherwise damaged due to circumstances attributable to the customer.</P>
        </Sub>
        <Sub n="10.6" title="Refund Processing">
          <P>Where a refund is approved, the refund will generally be processed through the original payment method or another appropriate method, subject to the applicable payment provider's processing timelines.</P>
          <P>Any refund will be limited to the amount actually paid for the affected product, unless otherwise required by applicable law.</P>
          <P>Nothing in this section is intended to exclude or restrict any consumer rights or remedies that cannot legally be excluded or restricted under applicable law.</P>
        </Sub>
      </Section>

      <Section n="11" title="Damaged or Incorrect Products">
        <P>If you receive a product that is damaged, defective or materially different from the product you ordered, please contact Sojaru as soon as reasonably possible after delivery.</P>
        <P>Please provide your order number and, where requested, clear photographs or videos showing the product and its packaging.</P>
        <P>After reviewing the claim, Sojaru may provide a replacement or refund in accordance with Section 10 above.</P>
        <P>For customized products, a replacement or refund will only be provided where the customized product is delivered damaged or defective, subject to verification.</P>
        <P>If an incorrect product has been delivered due to an error on the part of Sojaru, we will review the issue and provide an appropriate remedy in accordance with applicable law.</P>
      </Section>

      <Section n="12" title="User Content">
        <P>If the Website allows you to submit reviews, photographs, comments, designs, suggestions or other content ("User Content"), you remain responsible for the content you submit.</P>
        <P>You agree not to submit content that:</P>
        <List items={[
          "violates any law; infringes third-party intellectual property rights; contains malicious software; is fraudulent or misleading; contains unlawful or harmful material; violates another person's privacy; or otherwise interferes with the operation of the Website.",
        ]} />
        <P>By submitting User Content for publication or display on the Website, you grant Sojaru a non-exclusive, royalty-free right to use, reproduce, display and distribute that content for purposes related to operating, promoting and improving our services, unless otherwise prohibited by law.</P>
        <P>This does not give Sojaru ownership of intellectual property that you independently own.</P>
      </Section>

      <Section n="13" title="Promotional Communications">
        <P>Where permitted by applicable law, you may receive promotional communications from Sojaru if you have opted in or otherwise provided appropriate consent.</P>
        <P>You may unsubscribe from promotional communications using the unsubscribe mechanism provided in the communication or by contacting us.</P>
        <P>Transactional communications relating to your orders, payments, deliveries or account may still be sent where necessary.</P>
      </Section>

      <Section n="14" title="Third-Party Services and Links">
        <P>The Website may use or link to third-party services, websites and platforms, including payment processors, logistics providers, analytics services and other service providers.</P>
        <P>We are not responsible for the content, availability, security, policies or practices of third-party websites or services.</P>
        <P>Your use of third-party services may be subject to the third party's own terms and privacy policies.</P>
      </Section>

      <Section n="15" title="Prohibited Use">
        <P>You agree not to:</P>
        <List items={[
          "use the Website for unlawful purposes; attempt to gain unauthorized access to the Website or its systems; interfere with the security or operation of the Website; introduce viruses, malware or other harmful code; use automated systems to scrape or extract Website content without permission; impersonate another person or entity; provide false or misleading information; engage in fraudulent transactions; or otherwise misuse the Website.",
        ]} />
        <P>We reserve the right to restrict or terminate access to the Website where we reasonably believe these Terms have been violated.</P>
      </Section>

      <Section n="16" title="Website Availability">
        <P>We aim to keep the Website available and functioning properly, but we do not guarantee that it will always be uninterrupted, secure, error-free or available at all times.</P>
        <P>The Website may occasionally be unavailable due to maintenance, technical issues, updates, security concerns or circumstances beyond our reasonable control.</P>
      </Section>

      <Section n="17" title="Disclaimer">
        <P>To the maximum extent permitted by applicable law, the Website and its content are provided on an "as available" basis.</P>
        <P>We do not guarantee that:</P>
        <List items={[
          "the Website will always operate without interruption; all information will always be complete or error-free; the Website will be free from viruses or other harmful components; or every product will remain continuously available.",
        ]} />
        <P>Nothing in these Terms excludes or limits any liability that cannot legally be excluded or limited under applicable law.</P>
      </Section>

      <Section n="18" title="Limitation of Liability">
        <P>To the maximum extent permitted by applicable law, Sojaru shall not be liable for indirect, incidental, special or consequential losses arising from your use of the Website or purchase of products, except where such liability cannot lawfully be excluded.</P>
        <P>Our liability in relation to a particular order will, to the extent permitted by applicable law, generally be limited to the amount paid by you for the relevant product or order.</P>
        <P>This limitation does not apply to liabilities that cannot legally be limited or excluded.</P>
      </Section>

      <Section n="19" title="Indemnification">
        <P>You agree to indemnify and hold harmless Sojaru, its owners, employees, representatives, service providers and affiliates from claims, losses, liabilities, damages and expenses arising from:</P>
        <List items={[
          "your violation of these Terms; your misuse of the Website; your violation of applicable law; or your submission of content that infringes the rights of another person or entity.",
        ]} />
        <P>This provision applies to the extent permitted by applicable law.</P>
      </Section>

      <Section n="20" title="Privacy">
        <P>Your use of the Website is also governed by our Privacy Policy, which explains how we collect, use, store and process personal information.</P>
        <P>By using the Website, you acknowledge that you have read and understood our Privacy Policy.</P>
      </Section>

      <Section n="21" title="Changes to These Terms">
        <P>We may update or modify these Terms from time to time.</P>
        <P>The updated version will be posted on this page with a revised "Last Updated" date. Your continued use of the Website after the updated Terms are posted constitutes acceptance of the revised Terms, to the extent permitted by applicable law.</P>
      </Section>

      <Section n="22" title="Governing Law and Jurisdiction">
        <P>These Terms shall be governed by and interpreted in accordance with the laws of India.</P>
        <P>Subject to applicable consumer protection laws and any mandatory rights available to customers, disputes arising in connection with these Terms or your use of the Website shall be subject to the jurisdiction of the competent courts in Kolkata, West Bengal, India.</P>
      </Section>

      <Section n="23" title="Severability">
        <P>If any provision of these Terms is determined to be invalid, unlawful or unenforceable, that provision shall be modified or removed to the extent necessary, and the remaining provisions shall continue to remain in effect.</P>
      </Section>

      <Section n="24" title="Entire Agreement">
        <P>These Terms, together with the Privacy Policy and any other policies published on the Website, constitute the terms governing your use of the Website and purchase of products from Sojaru, subject to applicable law.</P>
      </Section>

      <Section n="25" title="Contact Us">
        <P>If you have questions regarding these Terms, your order or our services, you may contact us at:</P>
        <div className="mt-3 rounded-xl bg-oat/60 p-5 text-sm leading-relaxed">
          <p className="font-semibold text-ink">Sojaru</p>
          <p>Website: www.sojaru.co.in</p>
          <p>Email: <a href="mailto:hello@sojaru.co.in" className="text-terracotta hover:underline">hello@sojaru.co.in</a></p>
          <p>Phone: <a href="tel:+919477909496" className="text-terracotta hover:underline">+91 94779 09496</a></p>
        </div>
      </Section>
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{n}. {title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
function Sub({ n, title, children }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold text-ink">{n} {title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}
function P({ children }) {
  return <p className="text-sm leading-relaxed sm:text-base">{children}</p>;
}
function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed sm:text-base">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

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
