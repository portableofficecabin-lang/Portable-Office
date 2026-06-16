import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How long will my portable cabin last and what maintenance is needed?",
    answer: "Our portable cabins are built to last 15–25 years with proper care. Maintenance is minimal — periodic cleaning, checking seals and joints, and ensuring drainage systems are clear. We provide a detailed maintenance guide with every delivery and our after-sales team is always a phone call away.",
  },
  {
    question: "Can they withstand the Indian weather — monsoons, heatwaves?",
    answer: "Absolutely. Our cabins are specifically engineered for the Indian climate. We use weather-resistant sandwich panels, anti-corrosive coatings, and proper insulation to handle everything from heavy monsoon rains to blistering summer heat. Many of our cabins have been through multiple monsoon seasons without any issues.",
  },
  {
    question: "What permissions and approvals do I need before installation?",
    answer: "Requirements vary by location and intended use. For temporary structures on construction sites, you typically need site approval from the project manager. For semi-permanent installations, local municipal permissions may be required. We can guide you through the entire approval process and help with documentation.",
  },
  {
    question: "Can I relocate my cabin to a different site?",
    answer: "Yes! That's one of the biggest advantages of our modular design. Our cabins are built in sections specifically so they can be disassembled, transported and reassembled at a new location. We offer a full relocation service — just let us know when and where.",
  },
  {
    question: "What utilities and facilities can I include in my cabin design?",
    answer: "Pretty much anything you need. We can integrate electrical wiring, plumbing, HVAC systems, internet connectivity, fire safety equipment, and more. Whether you need a basic setup or a fully-loaded office with conference rooms, we can make it happen.",
  },
];

export function FAQSection() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section className="section-padding bg-muted/50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
              Got Questions?
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about our portable cabin solutions.
            </p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-8 mb-8 text-left">
            <h3 className="font-display font-bold text-xl text-foreground mb-3">Choosing the Right Portable Workspace</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Selecting the ideal portable workspace starts with understanding your specific needs and the options available. Factors such as size, material, and intended use play a crucial role—MS portable cabins are known for their strength and adaptability, while office containers offer spacious, long-term solutions for growing teams. It's important to consider the quote price, ensuring you receive quality products and smart design that fit your budget and requirements. Look for suppliers and leading manufacturers in India who provide a comprehensive range of products, from compact security cabins to large modular office complexes, and who can support you with expert advice on specifications, installation, and future expansion. Maintenance, storage, and the ability to relocate your cabin as your business evolves are also key considerations. By focusing on quality, space, and access, and by partnering with experienced suppliers, clients and institutions can secure portable workspaces that not only meet today's demands but are ready to support tomorrow's growth. Requesting a detailed quote and discussing your needs with professionals ensures a smooth process from design to installation, delivering a workspace solution that truly works for you.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-card rounded-xl border border-border/50 px-6 shadow-sm data-[state=open]:shadow-md data-[state=open]:border-accent/30 transition-all"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:text-accent hover:no-underline py-5 text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
