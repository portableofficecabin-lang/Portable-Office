"use client";

import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/SEOHead";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import {
  Users,
  TrendingUp,
  Heart,
  Award,
  Briefcase,
  GraduationCap,
  Send,
  CheckCircle2,
  MapPin,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <span className="text-muted-foreground leading-relaxed">{children}</span>
    </li>
  );
}

const values = [
  {
    icon: Award,
    title: "Quality First",
    desc: "We never cut corners. Every cabin, container, and structure we build meets the highest standards — and we expect the same dedication from our team.",
  },
  {
    icon: Users,
    title: "Teamwork That Counts",
    desc: "Great results come from great collaboration. We work as one team — across departments, sites, and projects — to deliver outstanding results.",
  },
  {
    icon: Heart,
    title: "Respect & Integrity",
    desc: "Honesty, fairness, and mutual respect aren't just words here. They're the foundation of every interaction, from the factory floor to the boardroom.",
  },
  {
    icon: Sparkles,
    title: "Innovation & Growth",
    desc: "The modular construction industry is evolving fast, and so are we. We encourage fresh ideas, creative problem-solving, and continuous learning.",
  },
];

const benefits = [
  "Competitive salary packages with performance-based incentives",
  "Hands-on training and skill development programs",
  "Clear career progression paths — from entry-level to leadership",
  "Exposure to large-scale commercial and industrial projects",
  "A supportive, safety-first work environment",
  "Flexible working arrangements where applicable",
  "Health and wellness benefits for you and your family",
  "Employee recognition and reward programs",
];

const openings = [
  {
    title: "Production Supervisor",
    department: "Manufacturing",
    location: "Hosur, Tamil Nadu",
    type: "Full-time",
  },
  {
    title: "Sales Executive — B2B",
    department: "Sales & Business Development",
    location: "Bangalore, Karnataka",
    type: "Full-time",
  },
  {
    title: "Site Installation Engineer",
    department: "Operations",
    location: "Hosur & Bangalore",
    type: "Full-time",
  },
  {
    title: "AutoCAD / 3D Design Engineer",
    department: "Design & Engineering",
    location: "Bangalore, Karnataka",
    type: "Full-time",
  },
];

export default function CareersPage() {
  return (
    <Layout>
      <SEOHead
        title="Careers | Join Our Team at Portable Office Cabin"
        description="Explore exciting career opportunities at Portable Office Cabin. Join India's leading portable cabin and modular building manufacturer. We're hiring talented professionals who share our passion for quality."
        keywords="portable cabin careers, modular building jobs, prefab construction careers, manufacturing jobs Bangalore, portable office cabin hiring"
        canonicalUrl="https://portableofficecabin.com/careers"
        structuredData={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Careers", url: "https://portableofficecabin.com/careers" },
        ])}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-navy-light overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--accent)/0.15),transparent_60%)]" />
        <div className="container-custom relative py-20 lg:py-28">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="max-w-3xl"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent font-semibold text-sm mb-6 backdrop-blur-sm border border-accent/30">
              We're Hiring
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Build Your Career With Us
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl mb-8">
              Join a team that's shaping the future of modular construction in India. At Portable Office Cabin, you'll find meaningful work, real growth, and the chance to make a lasting impact.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="accent" size="xl" asChild>
                <a href="#openings">View Open Positions</a>
              </Button>
              <Button variant="outline-light" size="xl" asChild>
                <a href="mailto:admin@portableofficecabin.com">Send Your CV</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Company Intro */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Who We Are
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              Portable Office Cabin is one of India's most trusted names in the portable cabin and modular building industry. For over 15 years, we've been designing, manufacturing, and delivering premium portable structures — from site offices and container workspaces to prefab homes and security cabins.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Our team of skilled professionals is the backbone of everything we do. We're always looking for motivated individuals who want to grow alongside a company that values hard work, innovation, and integrity.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Culture & Values */}
      <section className="py-16 lg:py-20 bg-muted/50">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Culture & Values
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We've built more than structures — we've built a workplace where people genuinely enjoy coming to work.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full border-none shadow-md hover:shadow-xl transition-shadow duration-300 bg-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-7 w-7 text-accent" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Work With Us?
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Working at Portable Office Cabin means more than a pay cheque. It means being part of a team that takes pride in delivering quality, supporting each other's growth, and building something meaningful every single day.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're a seasoned professional or just starting your career, you'll find an environment that challenges you, supports you, and celebrates your contributions.
              </p>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              <ul className="space-y-3">
                {benefits.map((b, i) => (
                  <Bullet key={i}>{b}</Bullet>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Growth & Development */}
      <section className="py-16 lg:py-20 bg-muted/50">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Growth & Career Development
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We invest in our people because their growth drives ours. Here's how we help you move forward.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "Structured Career Paths",
                desc: "We don't believe in dead-end roles. Every position comes with clear milestones, regular reviews, and real opportunities to step up into leadership.",
              },
              {
                icon: GraduationCap,
                title: "Learning & Training",
                desc: "From on-the-job mentorship to technical workshops and safety certifications — we provide the tools you need to sharpen your skills and stay ahead.",
              },
              {
                icon: Briefcase,
                title: "Cross-Functional Exposure",
                desc: "Work across design, production, logistics, and client management. You'll gain a well-rounded understanding of the entire modular construction process.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full border-none shadow-md bg-card">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Current Openings */}
      <section id="openings" className="py-16 lg:py-20 bg-background scroll-mt-20">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Current Job Openings
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ready to join us? Check out our open roles below. If something catches your eye, we'd love to hear from you.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {openings.map((job, i) => (
              <motion.div
                key={job.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="border border-border hover:border-accent/40 hover:shadow-lg transition-all duration-300 bg-card">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-display font-bold text-lg text-foreground mb-1">
                          {job.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {job.department}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {job.type}
                          </span>
                        </div>
                      </div>
                      <Button variant="accent" size="sm" asChild className="shrink-0">
                        <a href={`mailto:admin@portableofficecabin.com?subject=Application: ${encodeURIComponent(job.title)}`}>
                          Apply Now
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={5}
            className="text-center text-muted-foreground text-sm mt-8"
          >
            Don't see a role that fits? Send us your CV anyway — we're always looking for talented people.
          </motion.p>
        </div>
      </section>

      {/* Internship & Trainee */}
      <section className="py-16 lg:py-20 bg-muted/50">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                <GraduationCap className="h-7 w-7 text-accent" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Internship & Trainee Programs
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                Just getting started? Our internship and trainee programs are designed for students, fresh graduates, and career changers who want real-world experience in the modular construction industry.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You'll work alongside experienced professionals, contribute to live projects, and build practical skills that set you apart in the job market.
              </p>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              <ul className="space-y-3">
                <Bullet>3 to 6-month structured internship programs</Bullet>
                <Bullet>Hands-on experience across manufacturing, design, and operations</Bullet>
                <Bullet>Mentorship from senior team members</Bullet>
                <Bullet>Certificate of completion and recommendation letters</Bullet>
                <Bullet>High-performing interns may receive full-time offers</Bullet>
                <Bullet>Open to engineering, management, and trade diploma students</Bullet>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-primary via-primary to-navy-light relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--accent)/0.12),transparent_60%)]" />
        <div className="container-custom relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="max-w-3xl mx-auto text-center"
          >
            <Send className="h-10 w-10 text-accent mx-auto mb-6" />
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              How to Apply
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
              Applying is simple. Send your updated CV along with a brief cover note to either of the emails below. Mention the position you're interested in, and our HR team will get back to you within 3–5 working days.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button variant="accent" size="xl" asChild>
                <a href="mailto:admin@portableofficecabin.com?subject=Job Application">
                  <Send className="h-5 w-5 mr-2" />
                  admin@portableofficecabin.com
                </a>
              </Button>
              <Button variant="outline-light" size="xl" asChild>
                <a href="mailto:portableofficecabin@gmail.com?subject=Job Application">
                  <Send className="h-5 w-5 mr-2" />
                  portableofficecabin@gmail.com
                </a>
              </Button>
            </div>
            <p className="text-white/60 text-sm">
              Or call us at{" "}
              <a href="tel:+919731897976" className="text-accent font-semibold hover:underline">
                +91 9731897976
              </a>{" "}
              for any career-related queries.
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
