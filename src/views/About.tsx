import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Target, Eye, Users, Award, CheckCircle } from "lucide-react";

export default function AboutPage() {
  const values = [
    {
      icon: Award,
      title: "Quality Excellence",
      description: "We never compromise on quality. Every structure we build meets the highest industry standards.",
    },
    {
      icon: Users,
      title: "Customer Focus",
      description: "Our customers are at the heart of everything we do. Your satisfaction is our success.",
    },
    {
      icon: Target,
      title: "Innovation",
      description: "We continuously improve our products and processes to deliver better solutions.",
    },
  ];

  // The "Our Journey" timeline (2008 founded · 2012 100th project · 2016 prefab homes · 2020 500+
  // projects · 2024 industry leader) was removed 2026-11-26: no record supports any of its dates or
  // counts, and other pages gave other founding years. Restore it only with milestones the owner
  // confirms (docs/claims/sitewide-claims-2026-11-26.md).

  return (
    <Layout>
      {/* Hero */}
      <PageHero
        eyebrow="Who We Are"
        breadcrumbs={[{ name: "Home", href: "/" }, { name: "About Us" }]}
        title="About Us"
        description={
          <>
            We manufacture portable structures at our own factory in Tamil Nadu, near Hosur,
            that help businesses and individuals build their spaces anywhere.
          </>
        }
      />

      {/* Mission & Vision */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card rounded-2xl shadow-card p-8">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-accent" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                Our Mission
              </h2>
              <p className="text-muted-foreground">
                To provide high-quality, customizable portable structures that meet diverse 
                needs while ensuring durability, sustainability, and customer satisfaction. 
                We aim to make premium portable solutions accessible to everyone.
              </p>
            </div>
            <div className="bg-card rounded-2xl shadow-card p-8">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-accent" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                Our Vision
              </h2>
              <p className="text-muted-foreground">
                To be the global leader in portable and prefabricated structures, 
                recognized for innovation, quality, and exceptional customer service. 
                We envision a world where quality space is available to everyone, everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-muted/50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do and define who we are as a company.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div key={value.title} className="bg-card rounded-2xl shadow-card p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — navy, NOT bg-primary. In this theme --primary is amber and
          --primary-foreground is dark navy, so the previous combination rendered
          dark navy text on orange at roughly 2:1. White on navy-deep is 15:1. */}
      <section className="bg-navy-deep text-white py-16">
        <div className="container-custom text-center">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to Work With Us?
          </h2>
          <p className="text-white/75 mb-8 max-w-xl mx-auto">
            Let&apos;s discuss how we can help you with your portable structure needs.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link href="/products">View Products</Link>
            </Button>
            <Button variant="outline-light" size="lg" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
