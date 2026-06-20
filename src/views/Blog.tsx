"use client";

import { resolveImageUrl } from "@/utils/resolveImageUrl";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowRight, Calendar, Clock, User, Tag, BookOpen, Search,
  TrendingUp, ChevronRight, FileText, Bookmark, Share2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import labourShedImage from "@/assets/blog/labour-shed-steel-frame-construction.webp";
import portaCabinRentImage from "@/assets/blog/porta-cabins-on-rent.webp";
import msPortableCabinHero from "@/assets/blog/ms-portable-cabin-hero.webp";
import prefabColonyHero from "@/assets/blog/prefab-colony-hero.webp";
import portableCabinBangaloreHero from "@/assets/blog/portable-cabin-manufacturers-bangalore-factory.webp";

type BlogListPost = {
  title: string;
  description: string;
  slug: string;
  date: string;
  readTime: string;
  author: string;
  category: string;
  tags: string[];
  image: string | typeof labourShedImage;
  featured: boolean;
};

const staticBlogPosts: BlogListPost[] = [
  {
    title: "Portable Cabin Manufacturers in Bangalore",
    description: "Find reliable portable cabin manufacturers in Bangalore. Types, pricing (2025–2026), features, customization options, and step-by-step process from enquiry to installation across Bengaluru.",
    slug: "portable-cabin-manufacturers-in-bangalore",
    date: "March 14, 2026",
    readTime: "20 min read",
    author: "Portable Office Cabin",
    category: "Location Guide",
    tags: ["Portable Cabin", "Bangalore", "Manufacturers", "Bengaluru"],
    image: portableCabinBangaloreHero,
    featured: true,
  },
  {
    title: "Prefabricated Labor Colony in Bengaluru",
    description: "Complete guide to prefabricated labour colonies in Bengaluru – turnkey modular worker accommodation for construction sites, industrial projects, and infrastructure development across Karnataka.",
    slug: "prefabricated-labor-colony-bengaluru",
    date: "February 26, 2025",
    readTime: "25 min read",
    author: "Portable Office Cabin",
    category: "Prefab Structures",
    tags: ["Prefab Labour Colony", "Bengaluru", "Worker Accommodation", "Modular Housing"],
    image: prefabColonyHero,
    featured: false,
  },
  {
    title: "MS Portable Cabin - Durable Mild Steel Modular Building Solution",
    description: "Complete guide to MS portable cabins – heavy-duty mild steel construction, advanced insulation, weather-resistant coatings, modular design, and applications across industries.",
    slug: "ms-portable-cabin-durable-mild-steel-modular-building",
    date: "February 26, 2025",
    readTime: "15 min read",
    author: "Portable Office Cabin",
    category: "Buying Guide",
    tags: ["MS Portable Cabin", "Mild Steel", "Modular Building", "Prefabricated"],
    image: msPortableCabinHero,
    featured: false,
  },
  {
    title: "Porta Cabins on Rent – Flexible Portable Space by Portable Office Cabin",
    description: "Complete guide to renting porta cabins in India. Office cabins, security cabins, labour accommodation, container offices & portable toilets on hire with 3–7 day delivery.",
    slug: "porta-cabins-on-rent",
    date: "February 20, 2025",
    readTime: "18 min read",
    author: "Portable Office Cabin",
    category: "Rental Guide",
    tags: ["Porta Cabin Rent", "Rental", "Site Office", "Portable Space"],
    image: portaCabinRentImage,
    featured: false,
  },
  {
    title: "Labour Shed Prefabricated Structures: Complete Guide for Construction Sites",
    description: "Complete guide on prefabricated labour sheds for construction sites in India. Learn about design, benefits, installation timelines, and customization options for 50–1000+ worker camps.",
    slug: "labour-shed-prefabricated-structures",
    date: "January 15, 2025",
    readTime: "12 min read",
    author: "Portable Office Cabin",
    category: "Prefab Structures",
    tags: ["Labour Shed", "Prefabricated", "Construction", "Worker Accommodation"],
    image: labourShedImage,
    featured: false,
  },
];

const categoryNames = [
  "Buying Guide",
  "Rental Guide",
  "Prefab Structures",
  "Industry Insights",
  "Case Studies",
  "Location Guide",
];

const popularTags = [
  "Portable Cabin", "Prefabricated", "Container Office", "Site Office",
  "Labour Shed", "Modular Building", "Construction", "Prefab Home",
];

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Articles");
  const [allPosts, setAllPosts] = useState<BlogListPost[]>(staticBlogPosts);

  useEffect(() => {
    const fetchDbPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error || !data?.length) return;

      const staticSlugs = new Set(staticBlogPosts.map((p) => p.slug));
      const dbPosts: BlogListPost[] = data
        .filter((p) => !staticSlugs.has(p.slug))
        .map((p) => ({
          title: p.title,
          description: p.excerpt || "",
          slug: p.slug,
          date: formatDateSafe(p.published_at || p.created_at, "MMMM d, yyyy", ""),
          readTime: "5 min read",
          author: p.author || "Portable Office Cabin",
          category: p.category || "Industry Insights",
          tags: [],
          image: p.featured_image_url || msPortableCabinHero,
          featured: p.featured ?? false,
        }));

      setAllPosts([...staticBlogPosts, ...dbPosts]);
    };

    fetchDbPosts();
  }, []);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    allPosts.forEach((post) => {
      counts[post.category] = (counts[post.category] || 0) + 1;
    });

    return [
      { name: "All Articles", count: allPosts.length },
      ...categoryNames
        .filter((name) => (counts[name] || 0) > 0)
        .map((name) => ({ name, count: counts[name] || 0 })),
    ];
  }, [allPosts]);

  const filteredPosts = allPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "All Articles" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = allPosts.find((p) => p.featured);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-16 md:py-20 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, hsl(32 95% 52% / 0.4) 0%, transparent 45%), radial-gradient(circle at 75% 60%, hsl(32 95% 52% / 0.2) 0%, transparent 45%)' }} />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, hsl(210 40% 98% / 0.4) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-accent">Premium Portable Structures</span>
          </div>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            <Link href="/" className="transition-colors" style={{ color: 'hsl(var(--slate-100) / 0.75)' }}>Home</Link>
            <ChevronRight className="h-3.5 w-3.5" style={{ color: 'hsl(var(--slate-100) / 0.45)' }} />
            <span className="font-semibold text-accent">Blog</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight" style={{ color: 'hsl(var(--slate-50))' }}>
              Industry Insights & <span className="text-accent">Expert Guides</span>
            </h1>
            <p className="text-base md:text-lg max-w-2xl mb-10 leading-relaxed" style={{ color: 'hsl(var(--slate-100) / 0.86)' }}>
              Deep-dive articles on portable cabins, prefab structures, container offices, and modular building solutions. Written by industry experts.
            </p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/15 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2.5 text-lg font-bold" style={{ color: 'hsl(var(--slate-50))' }}>
                <BookOpen className="h-5 w-5 text-accent" />
                Blog Articles
              </div>
              <p className="text-sm mt-1" style={{ color: 'hsl(var(--slate-100) / 0.78)' }}>
                Showing <strong style={{ color: 'hsl(var(--slate-50))' }}>{filteredPosts.length}</strong> of <strong style={{ color: 'hsl(var(--slate-50))' }}>{allPosts.length}</strong> articles
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-4xl font-bold text-accent">{allPosts.length}</div>
              <div className="text-xs uppercase tracking-widest font-medium" style={{ color: 'hsl(var(--slate-100) / 0.62)' }}>Total Articles</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">

            {/* Left: Articles Column */}
            <div className="lg:col-span-2 space-y-8">

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles by title or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-card border-border/60 focus:border-accent"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeCategory === cat.name
                        ? "bg-accent text-accent-foreground shadow-md"
                        : "bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>

              {/* Featured Post */}
              {featuredPost && activeCategory === "All Articles" && !searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="block group relative overflow-hidden rounded-2xl border border-border/50 bg-card hover:shadow-xl transition-all duration-300"
                  >
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-accent text-accent-foreground font-semibold px-3 py-1">
                        ⭐ Featured Article
                      </Badge>
                    </div>
                    <div className="aspect-[16/8] overflow-hidden">
                      <img
                        src={resolveImageUrl(featuredPost.image)}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                      <div className="p-6 md:p-8">
                        <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/75 mb-3">
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-accent" />{featuredPost.author}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-accent" />{featuredPost.date}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-accent" />{featuredPost.readTime}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors leading-tight">
                          {featuredPost.title}
                        </h2>
                        <p className="text-foreground/80 mb-4 line-clamp-2">{featuredPost.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {featuredPost.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-secondary text-foreground/75 px-2.5 py-1 rounded-full">{tag}</span>
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1 text-accent font-semibold text-sm">
                            Read More <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
              )}

              {/* Article Cards */}
              <div className="space-y-6">
                {filteredPosts.map((post, index) => (
                  <motion.div
                    key={post.slug + index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex flex-col sm:flex-row gap-5 bg-card border border-border/50 rounded-xl p-4 md:p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-300 group"
                    >
                      {/* Thumbnail */}
                      <div className="sm:w-48 sm:min-w-[12rem] aspect-[16/10] sm:aspect-square rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={resolveImageUrl(post.image)}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/75 mb-2">
                            <Badge variant="secondary" className="text-xs font-medium">{post.category}</Badge>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-accent" />{post.date}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-accent" />{post.readTime}</span>
                          </div>
                          <h3 className="text-base md:text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-sm text-foreground/80 line-clamp-2 mb-3">{post.description}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{post.author}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-accent font-semibold text-xs">
                            Read Article <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {filteredPosts.length === 0 && (
                <div className="text-center py-16 bg-card rounded-xl border border-border/50">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
                  <p className="text-muted-foreground text-sm">Try a different search term or category.</p>
                </div>
              )}
            </div>

            {/* Right: Sidebar */}
            <aside className="space-y-6">

              {/* About the Blog */}
              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" /> About This Blog
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Expert insights from India's leading portable cabin & prefab structure manufacturer.
                  We share buying guides, cost comparisons, project case studies, and construction industry trends.
                </p>
              </div>

              {/* Trending Topics */}
              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" /> Trending Topics
                </h3>
                <ul className="space-y-3">
                  {[
                    { title: "Portable Cabin Price in India 2025", views: "2.4K views" },
                    { title: "Container Office Setup Guide", views: "1.8K views" },
                    { title: "Prefab vs Traditional Construction", views: "1.5K views" },
                    { title: "Labour Camp Design Standards", views: "1.2K views" },
                  ].map((topic) => (
                    <li key={topic.title}>
                      <Link
                        href="/blog/labour-shed-prefabricated-structures"
                        className="flex items-start gap-3 group/item"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover/item:text-accent transition-colors leading-snug">{topic.title}</p>
                          <span className="text-xs text-foreground/70">{topic.views}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Popular Tags */}
              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-accent" /> Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-secondary text-foreground/80 px-3 py-1.5 rounded-full hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA Card */}
              <div className="rounded-xl p-6 text-accent-foreground relative overflow-hidden shadow-accent" style={{ background: 'var(--gradient-accent)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 100% / 0.3) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-2">Need a Custom Cabin?</h3>
                  <p className="text-sm opacity-95 mb-4">
                    Get a free quote for portable cabins, container offices, and prefab structures tailored to your project.
                  </p>
                  <Button asChild variant="outline" className="w-full bg-accent-foreground/10 border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/20">
                    <Link href="/contact">Get Free Quote →</Link>
                  </Button>
                </div>
              </div>

              {/* Newsletter-style CTA */}
              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-accent" /> Stay Updated
                </h3>
                <p className="text-sm text-foreground/80 mb-4">
                  Bookmark this page for the latest articles on portable cabins & prefab industry news.
                </p>
                <Button asChild className="w-full btn-accent text-sm">
                  <Link href="/products">Browse Products</Link>
                </Button>
              </div>

            </aside>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Looking for Portable Cabin Solutions?
          </h2>
          <p className="text-primary-foreground/70 mb-6 max-w-xl mx-auto">
            Explore our complete range of portable cabins, container offices, and prefab structures. India's most trusted manufacturer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="btn-accent">
              <Link href="/products">View All Products</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
