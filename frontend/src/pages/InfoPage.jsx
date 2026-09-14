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
    title: "Privacy Policy", eyebrow: "Last Updated: 14 September 2026",
    render: () => <PrivacyContent />,
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

function PrivacyContent() {
  return (
    <div className="max-w-3xl space-y-8 text-ink/80" data-testid="privacy-content">
      <P>At Sojaru, we respect your privacy and are committed to protecting the personal information you provide to us.</P>
      <P>This Privacy Policy explains how Sojaru ("Sojaru", "we", "us", or "our") collects, uses, stores, shares and protects information when you visit or use www.sojaru.co.in ("Website"), place an order, purchase our products, submit a customization request, or otherwise interact with us.</P>
      <P>By using our Website or providing your information to us, you acknowledge that you have read and understood this Privacy Policy.</P>

      <Section n="1" title="Information We Collect">
        <P>Depending on how you interact with our Website and services, we may collect the following information.</P>
        <Sub n="1.1" title="Personal Information">
          <P>When you create an account, place an order, contact us or otherwise interact with us, we may collect information such as:</P>
          <List items={[
            "Full name", "Email address", "Phone number", "Billing address", "Shipping/delivery address", "Order details", "Payment and transaction-related information", "Account login information, where applicable", "Information you provide when contacting customer support",
          ]} />
          <P>We collect only information that is reasonably necessary for providing our products and services.</P>
        </Sub>
        <Sub n="1.2" title="Customization Information">
          <P>If you place a customized order, you may provide:</P>
          <List items={["Images and photographs", "Artwork or designs", "Logos", "Text", "Names", "Other personalization instructions"]} />
          <P>Such information may be processed and stored as reasonably necessary to create and fulfil your customized order.</P>
          <P>You are responsible for ensuring that you have the necessary rights and permissions to provide such content to us.</P>
        </Sub>
        <Sub n="1.3" title="Technical Information">
          <P>When you visit our Website, certain technical information may be collected automatically, which may include:</P>
          <List items={[
            "IP address", "Browser type", "Device type", "Operating system", "Pages visited", "Date and time of visits", "Referring website or source", "General Website usage information", "Cookies and similar technologies",
          ]} />
          <P>This information may be used to maintain, secure and improve the Website and understand how visitors use our services.</P>
        </Sub>
      </Section>

      <Section n="2" title="How We Use Your Information">
        <P>We may use the information we collect to:</P>
        <List items={[
          "Process and fulfil orders; Process customized orders; Process payments; Arrange shipping and delivery; Provide customer support; Communicate with you regarding your orders; Send transactional notifications; Respond to enquiries and requests; Manage customer accounts, where applicable; Prevent fraud, abuse and unauthorized activity; Maintain and secure our Website; Improve our products, services and Website; Understand Website usage and performance; Send promotional communications where permitted and where you have provided the necessary consent; and Comply with applicable legal and regulatory requirements.",
        ]} />
        <P>We may also use information where reasonably necessary to protect our legal rights, enforce our Terms &amp; Conditions, or investigate suspected misuse of the Website.</P>
      </Section>

      <Section n="3" title="Payment Information">
        <P>Payments made through the Website may be processed by third-party payment service providers such as Razorpay or other payment gateways that we may use.</P>
        <P>When you make a payment, your payment information may be collected and processed directly by the relevant payment provider.</P>
        <P>Sojaru does not ordinarily store complete debit card, credit card, banking or other sensitive payment credentials on its own servers.</P>
        <P>Payment providers may process your information in accordance with their own privacy policies and terms.</P>
      </Section>

      <Section n="4" title="Cookies and Similar Technologies">
        <P>Our Website may use cookies and similar technologies to improve functionality, security and user experience.</P>
        <P>Cookies may help us:</P>
        <List items={[
          "Keep the Website functioning properly; Remember certain preferences; Maintain shopping or account sessions; Understand how visitors use the Website; Improve Website performance; and Support analytics or other Website functionality.",
        ]} />
        <P>You may be able to control or disable cookies through your browser settings. However, disabling certain cookies may affect the functionality of parts of the Website.</P>
      </Section>

      <Section n="5" title="How We Share Your Information">
        <P>We do not sell or rent your personal information to third parties.</P>
        <P>We may share relevant information with trusted third parties where reasonably necessary to operate our business and provide our services. These may include:</P>
        <Share label="Payment Service Providers">Payment providers may receive information necessary to process and verify your payment.</Share>
        <Share label="Shipping and Delivery Partners">We may provide your name, phone number, shipping address and order details to courier, logistics and delivery service providers for the purpose of delivering your order.</Share>
        <Share label="Technology and Hosting Providers">We may use third-party infrastructure and technology providers to host, operate, maintain and secure our Website, databases, files and related systems.</Share>
        <Share label="Email and Communication Providers">We may use third-party email or communication service providers to send transactional messages, order notifications, customer support communications and, where applicable, promotional communications.</Share>
        <Share label="Other Service Providers">We may use other trusted service providers where reasonably necessary for Website operation, analytics, security, customer support, order fulfilment or other legitimate business purposes.</Share>
        <P>These service providers are expected to process information only for the purposes for which it is provided or as otherwise permitted by applicable law.</P>
      </Section>

      <Section n="6" title="Customized Designs and Customer-Uploaded Content">
        <P>If you upload an image, photograph, artwork, logo or other content for customization, we will use that content primarily for processing and fulfilling your order.</P>
        <P>You should not upload content that you do not have the right to use or that contains personal information of another individual without the necessary permission.</P>
        <P>We may retain customized files and related order information for a reasonable period for purposes such as:</P>
        <List items={[
          "Processing your order; Customer support; Handling complaints or damaged-product claims; Resolving disputes; Maintaining transaction records; and Complying with legal obligations.",
        ]} />
        <P>We may delete or anonymize such information when it is no longer reasonably required, subject to applicable legal or business requirements.</P>
      </Section>

      <Section n="7" title="Data Security">
        <P>We take reasonable technical and organizational measures to protect personal information against unauthorized access, loss, misuse, alteration or disclosure.</P>
        <P>However, no method of transmission or electronic storage is completely secure. Therefore, while we take reasonable steps to protect your information, we cannot guarantee absolute security.</P>
        <P>You are also responsible for keeping your account credentials and passwords confidential and should notify us if you believe your account has been accessed without authorization.</P>
      </Section>

      <Section n="8" title="Data Retention">
        <P>We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including:</P>
        <List items={[
          "Processing and fulfilling orders; Maintaining transaction and business records; Providing customer support; Resolving disputes; Preventing fraud or misuse; Complying with legal, tax, accounting or regulatory obligations; and Protecting our legal rights.",
        ]} />
        <P>The period for which information is retained may vary depending on the type of information and the reason for which it was collected.</P>
      </Section>

      <Section n="9" title="Your Rights and Choices">
        <P>Subject to applicable law, you may have rights relating to your personal information, including the ability to:</P>
        <List items={[
          "Request access to certain personal information we hold about you; Request correction of inaccurate or incomplete information; Request deletion of personal information where legally permissible; Withdraw consent where processing is based on consent; Opt out of promotional communications; and Raise a concern or complaint regarding the handling of your personal information.",
        ]} />
        <P>To exercise an applicable right or raise a privacy-related concern, you may contact us using the details provided in the Contact Us section below.</P>
        <P>Certain information may need to be retained where required by law or where there is a legitimate reason for doing so.</P>
      </Section>

      <Section n="10" title="Promotional Communications">
        <P>If you have opted in to receive promotional communications, we may contact you by email, SMS, WhatsApp or other communication channels made available by us.</P>
        <P>You can opt out of promotional communications at any time by:</P>
        <List items={[
          "Using the unsubscribe option included in an email, where available; or Contacting us directly.",
        ]} />
        <P>Even if you opt out of promotional communications, we may continue to send essential transactional or service-related communications, such as order confirmations, payment updates, delivery notifications or responses to your enquiries.</P>
      </Section>

      <Section n="11" title="Third-Party Websites and Services">
        <P>Our Website may contain links to or integrations with third-party websites, applications or services.</P>
        <P>These third parties may have their own privacy policies and terms. We are not responsible for the privacy practices, security or content of third-party services that we do not control.</P>
        <P>We encourage you to review the privacy policies of relevant third-party services before providing them with your personal information.</P>
      </Section>

      <Section n="12" title="Children's Privacy">
        <P>Our Website is not intentionally designed to collect personal information from children without appropriate parental or guardian involvement.</P>
        <P>If you are under 18, you should use the Website and place orders with the involvement and consent of a parent or legal guardian.</P>
        <P>If we become aware that we have inadvertently collected personal information from a child in circumstances where such collection was not appropriate, we will take reasonable steps to address the situation in accordance with applicable law.</P>
      </Section>

      <Section n="13" title="Fraud Prevention and Security">
        <P>We may collect and use information reasonably necessary to detect, investigate and prevent:</P>
        <List items={[
          "Fraudulent transactions; Unauthorized access; Abuse of promotional offers; Payment fraud; Attempts to compromise the Website; and Other unlawful or unauthorized activities.",
        ]} />
        <P>We may share relevant information with payment providers, service providers, law enforcement authorities or other parties where reasonably necessary or legally required.</P>
      </Section>

      <Section n="14" title="Legal Disclosures">
        <P>We may disclose personal information where we reasonably believe that disclosure is necessary to:</P>
        <List items={[
          "Comply with applicable law, regulation, court order or legal process; Respond to a lawful request from a government or regulatory authority; Protect the rights, property or safety of Sojaru, our customers or others; Investigate suspected fraud or unlawful activity; or Enforce our Terms & Conditions or other applicable policies.",
        ]} />
      </Section>

      <Section n="15" title="Business Transfers">
        <P>If Sojaru's business, assets or operations are reorganized, merged, transferred, acquired or sold, personal information may be transferred as part of that transaction, subject to applicable law.</P>
        <P>Any such transfer will be handled in accordance with applicable privacy and data protection requirements.</P>
      </Section>

      <Section n="16" title="Changes to This Privacy Policy">
        <P>We may update this Privacy Policy from time to time to reflect changes in our services, technology, business practices or applicable laws.</P>
        <P>When we make changes, we will update the "Last Updated" date at the top of this Privacy Policy.</P>
        <P>We encourage you to review this page periodically to stay informed about how we handle personal information.</P>
      </Section>

      <Section n="17" title="Governing Law">
        <P>This Privacy Policy shall be governed by and interpreted in accordance with the laws of India, subject to applicable data protection and privacy laws.</P>
      </Section>

      <Section n="18" title="Contact Us">
        <P>If you have any questions, requests or concerns regarding this Privacy Policy or the way we handle your personal information, you may contact us at:</P>
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

function Share({ label, children }) {
  return (
    <div className="rounded-xl bg-oat/50 p-4">
      <p className="text-sm font-semibold text-ink sm:text-base">{label}</p>
      <p className="mt-1 text-sm leading-relaxed sm:text-base">{children}</p>
    </div>
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
