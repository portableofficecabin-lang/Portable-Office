"use client";

import { resolveImageUrl } from "@/utils/resolveImageUrl";
import Link from "next/link";
import { useState } from "react";
import { motion } from "@/components/ui/static-motion";
import { 
  Building2, 
  Clock, 
  Truck, 
  Shield, 
  Wrench, 
  Phone, 
  CheckCircle2,
  ArrowRight,
  Ruler,
  Zap,
  Wind,
  Lock,
  Calendar
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnquiryModal } from "@/components/products/EnquiryModal";
import { ShippingDeliveryModal } from "@/components/products/ShippingDeliveryModal";
import { Product } from "@/data/products";
import siteOfficeCabin20x10 from "@/assets/rental/site-office-cabin-20x10.webp";
import siteOfficeCabin100sqft from "@/assets/rental/site-office-cabin-100sqft.webp";
import portableSiteOffice400sqft from "@/assets/rental/portable-site-office-400sqft.webp";
import securityGuardCabin8x8 from "@/assets/rental/security-guard-cabin-8x8.webp";
import cargoStorageContainer40ft from "@/assets/rental/cargo-storage-container-40ft.webp";
import cargoStorageContainer20ft from "@/assets/rental/cargo-storage-container-20ft.jpg";

// Rental cabin data with detailed specifications
const rentalCabins = [
  {
    id: "rental-site-office-10x10",
    name: "Site Office Cabin",
    category: "Site Office Cabin",
    categorySlug: "site-office",
    description: "Perfect for small construction sites and temporary project management offices. Ideal for 2-3 persons.",
    image: siteOfficeCabin100sqft,
    size: {
      length: "10 ft",
      width: "10 ft",
      height: "8'6\" ft",
      area: "100 sq ft"
    },
    pricing: {
      daily: 450,
      weekly: 3150,
      monthly: 13500,
      security: 100000
    },
    features: [
      "Ceiling Fans: 1 No",
      "LED Tube Lights: 2 Nos",
      "Sliding Windows with Safety Grills: 3 Nos (Optional: 3' × 3' or 4' × 3')",
      "Switches & Sockets: 2 Nos per table",
      "AC Provision: 1 No",
      "Main Door: 1 No with lockable system"
    ],
    specs: {
      frame: "MS Steel",
      walls: "MS Steel / Galvanized Steel Sheet",
      insulation: "Glass Wool / Hitlon Foam",
      floor: "Cement Board with Vinyl Flooring"
    },
    minRental: "6 months (pricing revised for different durations)",
    availability: true
  },
  {
    id: "rental-site-office-20x10",
    name: "Site Office Cabin (20' × 10')",
    category: "Site Office Cabin",
    categorySlug: "site-office",
    description: "Ideal for small construction sites and temporary project management offices. Comfortably accommodates 8–9 persons.",
    image: siteOfficeCabin20x10,
    size: {
      length: "20 ft",
      width: "10 ft",
      height: "8'6\" ft",
      area: "200 sq ft"
    },
    pricing: {
      daily: 668,
      weekly: 4676,
      monthly: 20040,
      security: 200000
    },
    features: [
      "Ceiling Fans: 2 Nos",
      "LED Tube Lights: 4 Nos",
      "Sliding Windows with Safety Grills: 3 Nos (Optional: 3' × 3' or 4' × 3')",
      "Switches & Sockets: 2 Nos per table",
      "AC Provision: 1 No",
      "Main Door: 1 No with lockable system"
    ],
    specs: {
      frame: "MS Steel",
      walls: "MS Steel / Galvanized Steel Sheet",
      insulation: "Glass Wool / Hitlon Foam",
      floor: "Cement Board with Vinyl Flooring",
      roof: "Two-side sloped roof",
      electrical: "Full wiring with switches & sockets"
    },
    minRental: "6 months (pricing revised for different durations)",
    availability: true,
    popular: true
  },
  {
    id: "rental-site-office-40x10",
    name: "Portable Site Office Container",
    category: "Site Office Cabin",
    categorySlug: "site-office",
    description: "Premium office space for large projects. Includes separate meeting room and manager cabin. Ideal for 8-12 persons.",
    image: portableSiteOffice400sqft,
    size: {
      length: "40 ft",
      width: "10 ft",
      height: "8'6\" ft",
      area: "400 sq ft"
    },
    pricing: {
      daily: 4500,
      weekly: 25000,
      monthly: 85000,
      security: 50000
    },
    features: [
      "2 Split ACs installed",
      "12 power outlets",
      "LED panel lights",
      "Separate meeting area",
      "Manager cabin partition",
      "Pantry space",
      "4 windows with blinds - Optional: (3' x 3') or (4' x 3')"
    ],
    specs: {
      frame: "Heavy-duty galvanized steel",
      walls: "PPGI sandwich panels (60mm)",
      floor: "Marine plywood with premium vinyl",
      roof: "Double-layer insulated roofing",
      electrical: "3-phase ready with DB",
      insulation: "High-density PUF (50mm)"
    },
    minRental: "1 month",
    availability: true
  },
  {
    id: "rental-toilet-block-2",
    name: "Portable Toilet Block",
    category: "Portable Toilet Cabin",
    categorySlug: "portable-toilet",
    description: "Hygienic portable toilet solution for construction sites. Includes 2 toilet units with wash basin.",
    image: "/placeholder.svg",
    size: {
      length: "8 ft",
      width: "4 ft",
      height: "8'6\" ft",
      area: "32 sq ft"
    },
    pricing: {
      daily: 800,
      weekly: 4500,
      monthly: 15000,
      security: 10000
    },
    features: [
      "2 toilet cubicles",
      "Wash basin with mirror",
      "Exhaust fan",
      "Water tank (500L)",
      "Septic tank connection ready"
    ],
    specs: {
      frame: "Galvanized steel frame",
      walls: "FRP panels (waterproof)",
      floor: "Anti-skid FRP flooring",
      plumbing: "PVC plumbing with fixtures",
      ventilation: "Exhaust fan fitted",
      tank: "Integrated waste tank"
    },
    minRental: "1 week",
    availability: true
  },
  {
    id: "rental-toilet-block-4",
    name: "Portable Toilet Block",
    category: "Portable Toilet Cabin",
    categorySlug: "portable-toilet",
    description: "Large toilet facility for bigger sites. 4 independent toilet units with separate handwash area.",
    image: "/placeholder.svg",
    size: {
      length: "10 ft",
      width: "8 ft",
      height: "8'6\" ft",
      area: "80 sq ft"
    },
    pricing: {
      daily: 1400,
      weekly: 8000,
      monthly: 28000,
      security: 18000
    },
    features: [
      "4 toilet cubicles",
      "2 wash basins",
      "LED lighting",
      "Large water tank (1000L)",
      "Easy septic connection",
      "Ventilation system"
    ],
    specs: {
      frame: "Heavy-duty steel frame",
      walls: "Premium FRP panels",
      floor: "Anti-skid tiles on FRP",
      plumbing: "Premium PVC with SS fixtures",
      ventilation: "2 exhaust fans",
      tank: "Dual waste tank system"
    },
    minRental: "1 week",
    availability: true
  },
  {
    id: "rental-security-cabin",
    name: "Security Guard Cabin",
    category: "Security Cabin",
    categorySlug: "security-cabin",
    description: "Compact security booth for site entry points. Weather-proof design with 360° visibility.",
    image: securityGuardCabin8x8,
    size: {
      length: "8 ft",
      width: "8 ft",
      height: "8'6\" ft",
      area: "64 sq ft"
    },
    pricing: {
      daily: 600,
      weekly: 3500,
      monthly: 12000,
      security: 8000
    },
    features: [
      "360° glass windows - Optional: (3' x 3') or (4' x 3')",
      "Counter desk",
      "Fan point",
      "Light point",
      "Lockable cabin"
    ],
    specs: {
      frame: "MS powder-coated frame",
      walls: "Sandwich panel with glass",
      floor: "Plywood with anti-skid mat",
      windows: "Sliding glass all around",
      electrical: "Pre-wired for fan & light",
      roof: "Insulated with water proofing"
    },
    minRental: "1 week",
    availability: true
  },
  {
    id: "rental-store-room-40",
    name: "Material Cargo Storage Container",
    category: "Container Office",
    categorySlug: "container-office",
    description: "Large secure storage container for tools, materials, and equipment. Heavy-duty locking system.",
    image: cargoStorageContainer40ft,
    size: {
      length: "40 ft",
      width: "8 ft",
      height: "8'6\" ft",
      area: "320 sq ft"
    },
    pricing: {
      daily: 2000,
      weekly: 12000,
      monthly: 40000,
      security: 25000
    },
    features: [
      "Heavy-duty container doors",
      "Padlock provision",
      "Ventilation slots",
      "Forklift pockets",
      "Weatherproof sealing"
    ],
    specs: {
      frame: "Corten steel container",
      walls: "Corrugated steel (2mm)",
      floor: "Steel with plywood overlay",
      doors: "Double swing cargo doors",
      ventilation: "Marine-grade vents",
      security: "Multi-point locking"
    },
    minRental: "1 month",
    availability: true
  },
  {
    id: "rental-store-room-20",
    name: "Material Cargo Storage Container",
    category: "Container Office",
    categorySlug: "container-office",
    description: "Secure storage container for tools, materials, and equipment. Heavy-duty locking system.",
    image: cargoStorageContainer20ft,
    size: {
      length: "20 ft",
      width: "8 ft",
      height: "8'6\" ft",
      area: "160 sq ft"
    },
    pricing: {
      daily: 1200,
      weekly: 7000,
      monthly: 22000,
      security: 15000
    },
    features: [
      "Heavy-duty container doors",
      "Padlock provision",
      "Ventilation slots",
      "Forklift pockets",
      "Weatherproof sealing"
    ],
    specs: {
      frame: "Corten steel container",
      walls: "Corrugated steel (2mm)",
      floor: "Steel with plywood overlay",
      doors: "Double swing cargo doors",
      ventilation: "Marine-grade vents",
      security: "Multi-point locking"
    },
    minRental: "1 month",
    availability: true
  },
  {
    id: "rental-labour-accommodation-6",
    name: "Work Accommodation Bunker Container (6 Beds G+1 for 12 Staff)",
    category: "Portable Cabin",
    categorySlug: "portable-cabin",
    description: "Comfortable living quarters for site workers. Bunk bed arrangement for 6 beds (G+1 configuration for 12 staff) with attached toilet.",
    image: "/placeholder.svg",
    size: {
      length: "20 ft",
      width: "10 ft",
      height: "8'6\" ft",
      area: "200 sq ft"
    },
    pricing: {
      daily: 2500,
      weekly: 15000,
      monthly: 45000,
      security: 30000
    },
    features: [
      "6 double bunk beds (G+1)",
      "Attached toilet",
      "Ceiling fans",
      "Tube lights",
      "Lockers for each bed",
      "Mosquito mesh windows - Optional: (3' x 3') or (4' x 3')"
    ],
    specs: {
      frame: "Galvanized steel frame",
      walls: "Insulated sandwich panels",
      floor: "Marine plywood with vinyl",
      toilet: "Integrated wet area",
      electrical: "Full wiring with MCB",
      ventilation: "Cross ventilation design"
    },
    minRental: "1 month",
    availability: true
  },
  {
    id: "rental-labour-accommodation-12",
    name: "Work Accommodation Bunker Container (12 Beds G+1 for 24 Staff)",
    category: "Portable Cabin",
    categorySlug: "portable-cabin",
    description: "Large comfortable living quarters for site workers. Bunk bed arrangement for 12 beds (G+1 configuration for 24 staff) with attached toilet.",
    image: "/placeholder.svg",
    size: {
      length: "40 ft",
      width: "10 ft",
      height: "8'6\" ft",
      area: "400 sq ft"
    },
    pricing: {
      daily: 4000,
      weekly: 24000,
      monthly: 75000,
      security: 50000
    },
    features: [
      "12 double bunk beds (G+1)",
      "2 attached toilets",
      "Ceiling fans",
      "LED tube lights",
      "Lockers for each bed",
      "Mosquito mesh windows - Optional: (3' x 3') or (4' x 3')"
    ],
    specs: {
      frame: "Heavy-duty galvanized steel frame",
      walls: "Insulated sandwich panels (50mm)",
      floor: "Marine plywood with premium vinyl",
      toilet: "Dual integrated wet areas",
      electrical: "Full wiring with MCB panel",
      ventilation: "Cross ventilation with exhaust"
    },
    minRental: "1 month",
    availability: true
  }
];

const benefits = [
  {
    icon: Clock,
    title: "Flexible Rental Terms",
    description: "Daily, weekly, or monthly rentals to suit your project timeline"
  },
  {
    icon: Truck,
    title: "Free Delivery & Setup",
    description: "We deliver and install at your site within 48 hours"
  },
  {
    icon: Wrench,
    title: "Maintenance Included",
    description: "24/7 support with free maintenance during rental period"
  },
  {
    icon: Shield,
    title: "Quality Guaranteed",
    description: "All cabins are thoroughly inspected and sanitized before delivery"
  }
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

export default function RentalServicePage() {
  const [selectedCabin, setSelectedCabin] = useState<Product | null>(null);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

  const handleEnquire = (cabin: typeof rentalCabins[0]) => {
    const productForEnquiry: Product = {
      id: cabin.id,
      sku: `RENTAL-${cabin.id.toUpperCase()}`,
      name: cabin.name,
      category: cabin.category,
      categorySlug: cabin.categorySlug,
      description: cabin.description,
      shortDescription: cabin.description.slice(0, 100),
      features: cabin.features,
      specifications: Object.entries(cabin.specs).map(([label, value]) => ({ label, value })),
      images: [cabin.image],
      priceLabel: `${formatPrice(cabin.pricing.monthly)}/month`,
      featured: cabin.popular || false,
      inStock: cabin.availability
    };
    setSelectedCabin(productForEnquiry);
    setIsEnquiryOpen(true);
  };

  return (
    <Layout>
      {/* Hero Section - Modern Clean Design */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Solid gradient background for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/50" />
        
        {/* Modern geometric accents */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/4" />
        </div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-20">
          <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 to-transparent rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/4" />
        </div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        
        <div className="container-custom relative z-10">
          <div className="max-w-4xl">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-accent transition-colors">Home</Link>
              <span className="text-accent/50">→</span>
              <span className="text-accent font-medium">Rental Service & Hire</span>
            </nav>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="bg-accent/10 text-accent border-accent/20 mb-4 px-4 py-1.5">
                <Calendar className="w-3.5 h-3.5 mr-2" />
                Short & Long Term Rentals
              </Badge>
              
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
                Portable Cabin <span className="text-gradient-gold">Rental Service</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Need temporary office space, worker accommodation, or site facilities? 
                Our <span className="text-accent font-semibold">rental cabins</span> provide 
                cost-effective solutions for construction sites, events, and short-term projects 
                across Karnataka and South India.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button variant="accent" size="lg" className="gap-2 shadow-lg" asChild>
                  <a href="tel:+919731897976">
                    <Phone className="w-4 h-4" />
                    Call for Instant Quote
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="border-border hover:bg-accent/10 hover:border-accent/50 hover:text-accent">
                  View All Cabins
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-none shadow-card hover:shadow-card-hover transition-all duration-300 group">
                  <CardContent className="p-6 text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-accent/30 rounded-2xl blur-lg group-hover:blur-xl transition-all opacity-60 group-hover:opacity-80" />
                      {/* Icon container */}
                      <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary via-primary to-navy-deep flex items-center justify-center border-2 border-accent/50 shadow-lg group-hover:scale-105 transition-transform">
                        <benefit.icon className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2 text-foreground">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rental Cabins Listing */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4">Available for Hire</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Portable Cabins for <span className="text-accent">Rent</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Choose from our range of well-maintained portable cabins. All prices include delivery within Bangalore.
            </p>
          </div>

          <div className="space-y-8">
            {rentalCabins.map((cabin, index) => (
              <motion.div
                key={cabin.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-border/50 hover:border-accent/30 transition-colors">
                  <div className="grid lg:grid-cols-12 gap-0">
                    {/* Image */}
                    <div className="lg:col-span-4 relative bg-muted aspect-[4/3] lg:aspect-auto lg:min-h-[300px]">
                      <img 
                        src={resolveImageUrl(cabin.image)} 
                        alt={cabin.name}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                      {cabin.popular && (
                        <Badge className="absolute top-4 left-4 bg-accent text-primary z-10">
                          Most Popular
                        </Badge>
                      )}
                      <Badge className="absolute bottom-4 left-4 bg-primary/90 z-10">
                        {cabin.category}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-8 p-6 lg:p-8">
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* Details */}
                        <div className="lg:col-span-2">
                          <h3 className="font-display text-2xl font-bold mb-2">{cabin.name}</h3>
                          <p className="text-muted-foreground mb-4">{cabin.description}</p>

                          {/* Size Specifications */}
                          <div className="bg-muted/50 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-sm text-accent mb-3 flex items-center gap-2">
                              <Ruler className="w-4 h-4" />
                              Size & Dimensions
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Length:</span>
                                <span className="font-medium ml-1">{cabin.size.length}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Width:</span>
                                <span className="font-medium ml-1">{cabin.size.width}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Height:</span>
                                <span className="font-medium ml-1">{cabin.size.height}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Area:</span>
                                <span className="font-semibold text-accent ml-1">{cabin.size.area}</span>
                              </div>
                            </div>
                          </div>

                          {/* Technical Specs */}
                          <div className="mb-4">
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-accent" />
                              Technical Specifications
                            </h4>
                            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              {Object.entries(cabin.specs).slice(0, 4).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground">
                                    <span className="capitalize">{key}:</span> {value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Features */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Features Included:</h4>
                            <div className="flex flex-wrap gap-2">
                              {cabin.features.slice(0, 5).map((feature) => (
                                <Badge key={feature} variant="secondary" className="font-normal">
                                  {feature}
                                </Badge>
                              ))}
                              {cabin.features.length > 5 && (
                                <Badge variant="outline">+{cabin.features.length - 5} more</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="lg:border-l lg:pl-6 border-border">
                          <h4 className="font-semibold text-sm mb-4">Rental Pricing</h4>
                          
                          <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <span className="text-muted-foreground">Daily</span>
                              <span className="font-semibold">{formatPrice(cabin.pricing.daily)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                              <span className="text-muted-foreground">Weekly</span>
                              <span className="font-semibold">{formatPrice(cabin.pricing.weekly)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-accent/30 bg-accent/5 -mx-2 px-2 rounded">
                              <span className="font-medium">Monthly</span>
                              <span className="font-bold text-lg text-accent">{formatPrice(cabin.pricing.monthly)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Security Deposit
                              </span>
                              <span className="font-medium">{formatPrice(cabin.pricing.security)}</span>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground mb-4">
                            <p>✓ Delivery Charges: Applicable as per distance (delivery not included)</p>
                            <p>✓ Min. rental: {cabin.minRental}</p>
                          </div>

                          <Button 
                            variant="accent" 
                            className="w-full"
                            onClick={() => handleEnquire(cabin)}
                          >
                            Enquire Now
                          </Button>
                          <div className="mt-3">
                            <ShippingDeliveryModal />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Modern Clean Design */}
      <section className="py-20 relative overflow-hidden">
        {/* Clean gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-card to-background" />
        
        {/* Accent glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent rounded-full blur-3xl" />
        </div>
        
        <div className="container-custom text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-accent/10 text-accent border-accent/20 mb-4 px-4 py-1.5">
              Custom Solutions Available
            </Badge>
            
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Need a <span className="text-gradient-gold">Custom Rental</span> Solution?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              We offer custom cabin configurations for large projects. Get in touch for bulk rental discounts and long-term hire packages.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="accent" size="lg" className="gap-2 shadow-lg" asChild>
                <a href="tel:+919731897976">
                  <Phone className="w-4 h-4" />
                  +91 9731897976
                </a>
              </Button>
              <Button variant="outline" size="lg" className="border-border hover:bg-accent/10 hover:border-accent/50 hover:text-accent" asChild>
                <Link href="/contact">
                  Get Custom Quote
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enquiry Modal */}
      <EnquiryModal
        product={selectedCabin}
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />
    </Layout>
  );
}
