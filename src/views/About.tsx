import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Target, Eye, Users, Award, CheckCircle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { seoData, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

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

  const milestones = [
    { year: "2008", title: "Company Founded", description: "Started with a vision to revolutionize portable structures" },
    { year: "2012", title: "100th Project", description: "Delivered our 100th portable cabin installation" },
    { year: "2016", title: "Prefab Homes Launch", description: "Expanded into prefabricated home solutions" },
    { year: "2020", title: "500+ Projects", description: "Crossed 500 successful project deliveries" },
    { year: "2024", title: "Industry Leader", description: "Recognized as a leading portable structure manufacturer" },
  ];

  return (
    <Layout>
      <SEOHead
        title={seoData.about.title}
        description={seoData.about.description}
        keywords={seoData.about.keywords}
        canonicalUrl="https://portableofficecabin.com/about-us"
        structuredData={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "About Us", url: "https://portableofficecabin.com/about-us" },
        ])}
      />
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-6">
              About Us
            </h1>
            <p className="text-xl text-primary-foreground/80">
              For over 15 years, we've been manufacturing premium portable structures 
              that help businesses and individuals build their spaces anywhere.
            </p>
          </div>
        </div>
      </section>

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

      {/* Timeline */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Our Journey
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            {milestones.map((milestone, index) => (
              <div key={milestone.year} className="flex gap-6 pb-8 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-bold shrink-0">
                    {milestone.year.slice(2)}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-accent/20 mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <div className="text-accent font-semibold">{milestone.year}</div>
                  <h3 className="font-display font-bold text-lg text-foreground">
                    {milestone.title}
                  </h3>
                  <p className="text-muted-foreground">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container-custom text-center">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to Work With Us?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Let's discuss how we can help you with your portable structure needs.
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
