/**
 * INDUSTRIES WE SERVE — shared data for the homepage industry grid + its image pop-up.
 *
 * Pure data module (no "use client", no JSX): the server-rendered section shell and the
 * client grid island both read from here, so the copy exists once. CARD images are the
 * owner-supplied industry visuals (industry-*.webp, added 2026-08-01) chosen specifically
 * for this section; the pop-up GALLERY keeps real project/product photographs from the
 * asset library so every dialog still shows delivered work.
 * `gallery` holds the two extra shots the pop-up shows beyond the card image; the pop-up
 * mounts only when opened, so gallery images are fetched on demand, never on page load.
 *
 * Copy rules (site-wide): no unbacked figures — no project counts, client percentages or years.
 */
import {
  Building2, ConciergeBell, Factory, Fuel, GraduationCap, HardHat, HeartPulse,
  Landmark, Mountain, Route, Ticket, Warehouse, type LucideIcon,
} from "lucide-react";

import imgConstruction from "@/assets/products/construction-site-portable-office-crane.webp";
import imgConstruction2 from "@/assets/products/construction-site-portable-office-site-office.webp";
import imgConstruction3 from "@/assets/products/steel-portable-office-container-crane.webp";
import imgInfra from "@/assets/products/industry-infrastructure-epc.webp";
import imgInfra2 from "@/assets/products/labour-colony-site.webp";
import imgInfra3 from "@/assets/products/labor-hutments-aerial.webp";
import imgManufacturing from "@/assets/products/industry-manufacturing.webp";
import imgManufacturing2 from "@/assets/products/shipping-container-peenya-office.webp";
import imgManufacturing3 from "@/assets/products/site-office-container-manufacturers-exterior.webp";
import imgWarehousing from "@/assets/products/industry-warehousing-logistics.webp";
import imgWarehousing2 from "@/assets/products/shipping-container-storage-yard.webp";
import imgWarehousing3 from "@/assets/products/cargo-storage-containers-main.webp";
import imgMining from "@/assets/products/industry-mining-remote-sites.webp";
import imgMining2 from "@/assets/products/workmen-accommodation-double-storey.webp";
import imgMining3 from "@/assets/products/portable-cabin-40ft-bunkhouse.webp";
import imgEducation from "@/assets/products/industry-education.webp";
import imgEducation2 from "@/assets/products/cabins-in-office-modern.webp";
import imgEducation3 from "@/assets/products/porta-cabin.webp";
import imgHealthcare from "@/assets/products/industry-healthcare.webp";
import imgHealthcare2 from "@/assets/products/cabin-portable-office.webp";
import imgHealthcare3 from "@/assets/products/cabins-in-office-booths.webp";
import imgRealEstate from "@/assets/products/industry-real-estate.webp";
import imgRealEstate2 from "@/assets/products/container-office-wood-glass.webp";
import imgRealEstate3 from "@/assets/products/shipping-container-kormangala-office.webp";
import imgEnergy from "@/assets/products/industry-oil-gas-energy.webp";
import imgEnergy2 from "@/assets/products/shipping-container-sipcot-port.webp";
import imgEnergy3 from "@/assets/products/shipping-container-peenya-port.webp";
import imgHospitality from "@/assets/products/luxury-prefab-villa.webp";
import imgHospitality2 from "@/assets/products/family-prefab-home-2bhk.webp";
import imgHospitality3 from "@/assets/products/luxury-prefab-villa-g1.webp";
import imgGovernment from "@/assets/products/industry-government-defence.webp";
import imgGovernment2 from "@/assets/products/security-cabin-residential-gate.webp";
import imgGovernment3 from "@/assets/projects/porta-cabin-project-1.jpg";
import imgEvents from "@/assets/products/industry-events-exhibitions.webp";
import imgEvents2 from "@/assets/products/security-cabin.jpg";
import imgEvents3 from "@/assets/products/shipping-container-kormangala-cafe.webp";

export interface IndustryImage {
  image: { src: string };
  alt: string;
}

export interface Industry {
  icon: LucideIcon;
  name: string;
  desc: string;
  chips: [string, string];
  /** Card thumbnail (also the pop-up hero). */
  card: IndustryImage;
  /** Two extra shots shown only inside the pop-up. */
  gallery: [IndustryImage, IndustryImage];
}

export const industries: Industry[] = [
  {
    icon: HardHat, name: "Construction",
    desc: "Site offices, supervisor cabins and meeting rooms that move with the project.",
    chips: ["Site offices", "Supervisor cabins"],
    card: { image: imgConstruction, alt: "Portable site office cabin being crane-lifted at a construction site" },
    gallery: [
      { image: imgConstruction2, alt: "Portable site office installed at a construction site" },
      { image: imgConstruction3, alt: "Steel portable office container lifted by crane" },
    ],
  },
  {
    icon: Route, name: "Infrastructure & EPC",
    desc: "Labour colonies and site camps for road, metro, and large EPC packages.",
    chips: ["Labour colonies", "Site camps"],
    card: { image: imgInfra, alt: "Portable site office cabin at a cable-stayed bridge construction site" },
    gallery: [
      { image: imgInfra2, alt: "Labour colony site with rows of accommodation units" },
      { image: imgInfra3, alt: "Aerial view of labour hutments at a project site" },
    ],
  },
  {
    icon: Factory, name: "Manufacturing & Industrial",
    desc: "PEB sheds, shop-floor offices and in-plant cabins for factories and industrial estates.",
    chips: ["PEB buildings", "Shop-floor offices"],
    card: { image: imgManufacturing, alt: "Shop-floor office cabin beside a robotic assembly line inside a manufacturing plant" },
    gallery: [
      { image: imgManufacturing2, alt: "Container office unit at the Peenya industrial area" },
      { image: imgManufacturing3, alt: "Site office container at a manufacturing complex" },
    ],
  },
  {
    icon: Warehouse, name: "Warehousing & Logistics",
    desc: "Storage containers, dispatch offices and yard supervision cabins for hubs and depots.",
    chips: ["Storage containers", "Dispatch offices"],
    card: { image: imgWarehousing, alt: "Gate security and dispatch cabin at a warehouse with truck loading docks" },
    gallery: [
      { image: imgWarehousing2, alt: "Shipping containers in a storage yard" },
      { image: imgWarehousing3, alt: "Cargo storage container ready for dispatch" },
    ],
  },
  {
    icon: Mountain, name: "Mining & Remote Sites",
    desc: "Workmen accommodation, mess units and offices built for off-grid, hard-terrain sites.",
    chips: ["Workmen housing", "Mess units"],
    card: { image: imgMining, alt: "Containerised site office cabin overlooking an open-pit mine with a haul truck" },
    gallery: [
      { image: imgMining2, alt: "Double-storey workmen accommodation building" },
      { image: imgMining3, alt: "40 ft portable bunkhouse cabin for site crews" },
    ],
  },
  {
    icon: GraduationCap, name: "Education & Institutions",
    desc: "Modular classrooms, exam halls and admin blocks ready before the term starts.",
    chips: ["Classrooms", "Admin blocks"],
    card: { image: imgEducation, alt: "Modular classroom blocks arranged around a landscaped campus courtyard" },
    gallery: [
      { image: imgEducation2, alt: "Modern cabin office interior suitable for institutional use" },
      { image: imgEducation3, alt: "Porta cabin unit for institutional campuses" },
    ],
  },
  {
    icon: HeartPulse, name: "Healthcare & Clinics",
    desc: "OPD rooms, sample-collection kiosks and triage cabins for hospitals and health camps.",
    chips: ["OPD cabins", "Health camps"],
    card: { image: imgHealthcare, alt: "Glass-front portable clinic cabin with reception, waiting area and patient room" },
    gallery: [
      { image: imgHealthcare2, alt: "Portable office cabin adaptable as a consultation room" },
      { image: imgHealthcare3, alt: "Cabin booths adaptable for sample collection" },
    ],
  },
  {
    icon: Building2, name: "Real Estate & Sales Offices",
    desc: "Glass-front marketing suites and sales galleries that open on site in days.",
    chips: ["Sales galleries", "Marketing suites"],
    card: { image: imgRealEstate, alt: "Timber-clad glass sales gallery cabin in front of high-rise apartments" },
    gallery: [
      { image: imgRealEstate2, alt: "Wood-and-glass container office for a sales suite" },
      { image: imgRealEstate3, alt: "Container office installation at Koramangala" },
    ],
  },
  {
    icon: Fuel, name: "Oil, Gas & Energy",
    desc: "Equipment storage, crew cabins and site offices for plants, depots and solar farms.",
    chips: ["Equipment storage", "Crew cabins"],
    card: { image: imgEnergy, alt: "Portable control-room cabin at an oil and gas process plant" },
    gallery: [
      { image: imgEnergy2, alt: "Shipping containers at the SIPCOT industrial port area" },
      { image: imgEnergy3, alt: "Container units staged at an industrial port yard" },
    ],
  },
  {
    icon: ConciergeBell, name: "Hospitality & Farm Stays",
    desc: "Prefab villas, resort rooms and farm-stay units with finished interiors.",
    chips: ["Prefab villas", "Resort rooms"],
    card: { image: imgHospitality, alt: "Luxury prefabricated villa for hospitality and farm-stay use" },
    gallery: [
      { image: imgHospitality2, alt: "2 BHK family prefab home with finished exterior" },
      { image: imgHospitality3, alt: "Ground-plus-one luxury prefab villa" },
    ],
  },
  {
    icon: Landmark, name: "Government & Defence",
    desc: "Checkpoint cabins, guard rooms and site establishments for public projects.",
    chips: ["Checkpoints", "Guard rooms"],
    card: { image: imgGovernment, alt: "Row of site establishment cabins with the national flag at a government project" },
    gallery: [
      { image: imgGovernment2, alt: "Security cabin at a residential complex gate" },
      { image: imgGovernment3, alt: "Delivered porta cabin project installation" },
    ],
  },
  {
    icon: Ticket, name: "Events & Exhibitions",
    desc: "Portable toilets, ticket booths and organiser cabins for venues and public events.",
    chips: ["Portable toilets", "Ticket booths"],
    card: { image: imgEvents, alt: "Glass event pavilion lit at dusk for exhibitions and functions" },
    gallery: [
      { image: imgEvents2, alt: "Compact security and ticketing cabin for venues" },
      { image: imgEvents3, alt: "Container cafe conversion at an event-style venue" },
    ],
  },
];
