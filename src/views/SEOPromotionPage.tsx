"use client";

import Image from "next/image";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { SEOContent } from "@/data/seoPromotions";
import { ArrowRight, CheckCircle, Phone, Mail, MapPin, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SEOPromotionPageProps {
  content: SEOContent;
}

export function SEOPromotionPage({ content }: SEOPromotionPageProps) {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-secondary text-white py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
              {content.h1}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Premium quality {content.imageAlt} with fast installation and 10-year warranty.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="accent" size="lg" className="text-lg font-bold px-8 py-6" asChild>
                <Link href="/contact">Get Free Quote</Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-white/10 text-white border-white/30 hover:bg-white/20 text-lg font-bold px-8 py-6" asChild>
                <Link href="tel:+919731897976">Call Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image */}
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border relative aspect-[16/10]">
                <Image
                  src={content.imageUrl}
                  alt={content.imageAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                  priority
                />
              </div>

              {/* Paragraphs */}
              <div className="space-y-6">
                {content.content.map((paragraph, index) => (
                  <p key={index} className="text-lg text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Features */}
              <div className="bg-card rounded-2xl p-8 md:p-12 border border-border">
                <h2 className="font-display font-extrabold text-3xl mb-8 text-foreground">
                  Key Features of {content.imageAlt}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {content.keyFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
                      <p className="text-muted-foreground font-medium">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              <div className="bg-card rounded-2xl p-8 md:p-12 border border-border">
                <h2 className="font-display font-extrabold text-3xl mb-8 text-foreground">
                  {content.imageAlt} - Frequently Asked Questions
                </h2>
                <div className="space-y-6">
                  {content.faqs.map((faq, index) => (
                    <div key={index} className="border-b border-border pb-6 last:border-0">
                      <h3 className="font-bold text-xl text-foreground mb-3 flex items-center gap-3">
                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold">
                          {index + 1}
                        </span>
                        {faq.question}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed pl-11">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Products */}
              <div className="bg-muted/50 rounded-2xl p-8 md:p-12 border border-border">
                <h2 className="font-display font-extrabold text-3xl mb-8 text-foreground">
                  Related Products for {content.imageAlt}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {content.relatedProductLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      className="flex items-center justify-between bg-card rounded-xl p-5 border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
                    >
                      <span className="font-semibold text-foreground">{link.name}</span>
                      <ExternalLink className="w-4 h-4 text-primary" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Contact Card */}
              <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-2xl p-8 shadow-2xl">
                <h3 className="font-display font-extrabold text-2xl mb-6">
                  Ready to Get Started?
                </h3>
                <p className="text-white/90 mb-6">
                  Contact us today for a free consultation and customized quote for your {content.imageAlt}.
                </p>
                <div className="space-y-4">
                  <a href="tel:+919731897976" className="flex items-center gap-3 bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-all">
                    <Phone className="w-6 h-6 text-accent" />
                    <span className="font-bold text-lg">+91 9731897976</span>
                  </a>
                  <a href="mailto:sales@portableofficecabin.com" className="flex items-center gap-3 bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-all">
                    <Mail className="w-6 h-6 text-accent" />
                    <span className="font-bold">sales@portableofficecabin.com</span>
                  </a>
                  <div className="flex items-start gap-3 bg-white/10 rounded-xl p-4">
                    <MapPin className="w-6 h-6 text-accent shrink-0 mt-1" />
                    <span className="font-bold">
                      Factory in Tamil Nadu & Karnataka, Serving {content.location}
                    </span>
                  </div>
                </div>
                <Button variant="accent" size="lg" className="w-full mt-6 text-lg font-bold" asChild>
                  <Link href="/contact">
                    Get Free Quote
                  </Link>
                </Button>
              </div>

              {/* Quick Links */}
              <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
                <h3 className="font-display font-extrabold text-2xl mb-6 text-foreground">
                  Explore More
                </h3>
                <ul className="space-y-4">
                  <li>
                    <Link href="/products" className="flex items-center gap-2 text-muted-foreground font-medium hover:text-primary transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      View All Products
                    </Link>
                  </li>
                  <li>
                    <Link href="/about-us" className="flex items-center gap-2 text-muted-foreground font-medium hover:text-primary transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      About Our Company
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="flex items-center gap-2 text-muted-foreground font-medium hover:text-primary transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      Read Our Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="/gallery" className="flex items-center gap-2 text-muted-foreground font-medium hover:text-primary transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      Project Gallery
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Trust Card */}
              <div className="bg-amber-500/10 rounded-2xl p-8 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-foreground font-bold text-lg mb-4">
                  500+ Projects Delivered Across India
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-card rounded-full text-sm font-medium border border-border text-muted-foreground">
                    15+ Years Experience
                  </span>
                  <span className="px-3 py-1 bg-card rounded-full text-sm font-medium border border-border text-muted-foreground">
                    10-Year Warranty
                  </span>
                  <span className="px-3 py-1 bg-card rounded-full text-sm font-medium border border-border text-muted-foreground">
                    Pan-India Delivery
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
