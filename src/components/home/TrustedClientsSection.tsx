import { ShieldCheck } from "lucide-react";
import tataProjects from "@/assets/clients/tata-projects.jpg";
import asianPaints from "@/assets/clients/asian-paints.jpg";
import brigade from "@/assets/clients/brigade.jpg";
import mfar from "@/assets/clients/mfar.png";
import tataElectronics from "@/assets/clients/tata-electronics.webp";
import zhonhen from "@/assets/clients/zhonhen.webp";
import mythri from "@/assets/clients/mythri.webp";
import ashokLeyland from "@/assets/clients/ashok-leyland.jpg";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const clients = [
  { name: "Tata Projects", logo: tataProjects, sector: "Infrastructure & EPC" },
  { name: "Tata Electronics", logo: tataElectronics, sector: "Semiconductor Manufacturing" },
  { name: "Ashok Leyland", logo: ashokLeyland, sector: "Commercial Vehicles" },
  { name: "Asian Paints", logo: asianPaints, sector: "Manufacturing & Coatings" },
  { name: "Brigade Group", logo: brigade, sector: "Real Estate Development" },
  { name: "MFAR Constructions", logo: mfar, sector: "Commercial Construction" },
  { name: "Mythri Constructions", logo: mythri, sector: "Residential & Civil" },
  { name: "Zhonhen System Integration", logo: zhonhen, sector: "Industrial Systems" },
];

export function TrustedClientsSection() {
  // Duplicate the list so the marquee loops seamlessly
  const track = [...clients, ...clients];

  return (
    <section
      aria-labelledby="trusted-clients-heading"
      className="section-padding bg-secondary/40 border-y border-border overflow-hidden"
    >
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-background border border-border rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Trusted by India's Leading Companies
            </span>
          </div>
          <h2
            id="trusted-clients-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          >
            Trusted by Tata, Ashok Leyland, Brigade & 200+ Industry Leaders Across India
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Portable Office Cabin is the chosen portable cabin and container office supplier for India's top construction, manufacturing and real estate brands. From Tata Projects' infrastructure sites and Tata Electronics' semiconductor facility in Hosur, to Brigade Group residential builds and Asian Paints manufacturing units — our site offices, labour accommodations and storage containers are deployed where build quality, speed and on-time delivery actually matter.
          </p>
        </div>
      </div>

      <div className="relative group">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 z-10 bg-gradient-to-r from-secondary/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 z-10 bg-gradient-to-l from-secondary/80 to-transparent" />

        <div
          className="flex w-max animate-marquee group-hover:[animation-play-state:paused]"
          style={{ willChange: "transform" }}
        >
          {track.map((client, i) => (
            <div
              key={`${client.name}-${i}`}
              className="mx-3 sm:mx-4 shrink-0 w-[200px] sm:w-[240px]"
            >
              <div className="bg-background border border-border rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-accent/40">
                <div className="h-20 sm:h-24 w-full flex items-center justify-center mb-3">
                  <img
                    src={resolveImageUrl(client.logo)}
                    alt={`${client.name} – Portable Office Cabin client logo`}
                    loading="lazy"
                    className="max-h-full max-w-[80%] object-contain transition-transform duration-300 hover:scale-110 drop-shadow-sm"
                  />
                </div>
                <div className="font-display font-semibold text-sm text-foreground leading-tight">
                  {client.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {client.sector}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-custom">
        <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
          Logos are the property of their respective owners and are shown to indicate completed supply, rental or installation engagements.
        </p>
      </div>
    </section>
  );
}
