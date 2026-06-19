import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Project Manager, Horizon Construction",
    text: "We needed site offices for a large highway project and needed them fast. These guys delivered 8 fully equipped cabins in under 3 weeks. The quality is outstanding and they survived two full monsoon seasons without a single issue.",
    rating: 5,
  },
  {
    name: "Dr. Priya Sharma",
    role: "Principal, Greenfield International School",
    text: "When we needed additional classrooms and an admin block urgently, portable cabins were the perfect solution. The children love their new spaces and the parents can't believe how professional they look. Absolutely brilliant service.",
    rating: 5,
  },
  {
    name: "Anil Mehta",
    role: "Operations Head, BuildTech Infrastructure",
    text: "We've been using their portable cabins for security booths and site offices across multiple projects. Consistent quality, on-time delivery, and their after-sales support is genuinely the best we've experienced. Highly recommend.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="section-padding bg-background cv-section">
      <div className="container-custom">
        <div className="text-center mb-14">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            Client Stories
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5">
            Hear What Our Clients Have to Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Don't just take our word for it — hear from the businesses and institutions that trust us with their space solutions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="card-premium p-8 animate-fade-up relative"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-accent/10" />
              
              <div className="flex gap-1 mb-5">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              
              <p className="text-muted-foreground leading-relaxed mb-6 italic">
                "{testimonial.text}"
              </p>
              
              <div className="pt-5 border-t border-border/50">
                <div className="font-display font-bold text-foreground">{testimonial.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
