import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import tataProjects from "@/assets/clients/tata-projects.jpg";
import asianPaints from "@/assets/clients/asian-paints.jpg";
import brigade from "@/assets/clients/brigade.jpg";
import mfar from "@/assets/clients/mfar.png";
import tataElectronics from "@/assets/clients/tata-electronics.webp";
import zhonhen from "@/assets/clients/zhonhen.webp";
import mythri from "@/assets/clients/mythri.webp";
import ashokLeyland from "@/assets/clients/ashok-leyland.jpg";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

// `name` is NOT rendered as visible text — it only drives the accessible alt text on each logo.
const clients = [
  { name: "Tata Projects", logo: tataProjects },
  { name: "Tata Electronics", logo: tataElectronics },
  { name: "Ashok Leyland", logo: ashokLeyland },
  { name: "Asian Paints", logo: asianPaints },
  { name: "Brigade Group", logo: brigade },
  { name: "MFAR Constructions", logo: mfar },
  { name: "Mythri Constructions", logo: mythri },
  { name: "Zhonhen System Integration", logo: zhonhen },
];

export function TrustedClientsSection() {
  // Duplicate the list so the marquee loops seamlessly
  const track = [...clients, ...clients];

  return (
    <section
      aria-labelledby="trusted-clients-heading"
      className="relative section-padding border-y border-border overflow-hidden bg-gradient-to-b from-secondary/50 via-background to-secondary/50"
    >
      {/* Soft ambient glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-accent/[0.07] rounded-full blur-3xl" />

      <div className="container-custom relative">
        <div className="max-w-2xl mx-auto text-center mb-12 lg:mb-16">
          <h2
            id="trusted-clients-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight"
          >
            Join Our <span className="text-accent">Happy Customers</span>
          </h2>
          <p className="font-display text-xl sm:text-2xl text-muted-foreground mb-8">
            Connect With Us Today.
          </p>

          <Button variant="accent" size="lg" asChild>
            <Link href="/contact">
              Get a Free Quote
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Logo marquee — logos only, no customer names shown */}
      <div className="relative group motion-reduce:overflow-x-auto">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 z-10 bg-gradient-to-l from-background to-transparent" />

        <div
          className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ willChange: "transform" }}
        >
          {track.map((client, i) => (
            <div
              key={`${client.name}-${i}`}
              className="mx-2.5 sm:mx-4 shrink-0 w-[150px] sm:w-[200px]"
            >
              <div className="group/logo h-24 sm:h-28 bg-card border border-border rounded-xl px-5 flex items-center justify-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-accent/40 motion-reduce:hover:translate-y-0">
                <img
                  src={resolveImageUrl(client.logo)}
                  alt={`${client.name} – Portable Office Cabin client logo`}
                  loading="lazy"
                  className="max-h-16 sm:max-h-20 max-w-full object-contain grayscale opacity-70 transition duration-300 group-hover/logo:grayscale-0 group-hover/logo:opacity-100 motion-reduce:transition-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-custom relative">
        <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
          Logos are the property of their respective owners and are shown to indicate completed supply, rental or installation engagements.
        </p>
      </div>
    </section>
  );
}
