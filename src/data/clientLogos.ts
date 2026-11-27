import tataProjects from "@/assets/clients/tata-projects.jpg";
import asianPaints from "@/assets/clients/asian-paints.jpg";
import brigade from "@/assets/clients/brigade.jpg";
import mfar from "@/assets/clients/mfar.png";
import tataElectronics from "@/assets/clients/tata-electronics.webp";
import zhonhen from "@/assets/clients/zhonhen.webp";
import mythri from "@/assets/clients/mythri.webp";
import ashokLeyland from "@/assets/clients/ashok-leyland.jpg";

/**
 * Client logos for the homepage (TrustedClientsSection).
 *
 * A logo is shown ONLY when `permissionOnFile` is true, which means the owner holds BOTH:
 *   1. a purchase order, invoice, work order or delivery challan showing the company bought from us;
 *   2. the company's written permission to show its name and logo on this website.
 *
 * Neither is on record for any company yet (claims inventory E2,
 * docs/claims/sitewide-claims-2026-11-26.md), so every flag is false and the homepage shows no
 * client logo, client name or "trusted by" claim. The logo files stay on disk. When the owner
 * supplies both documents for a company, set its flag to true (and update clientLogos.test.ts).
 *
 * `name` is never rendered as visible text; it only drives the logo's alt text.
 */
export const CLIENT_LOGOS = [
  { name: "Tata Projects", logo: tataProjects, permissionOnFile: false },
  { name: "Tata Electronics", logo: tataElectronics, permissionOnFile: false },
  { name: "Ashok Leyland", logo: ashokLeyland, permissionOnFile: false },
  { name: "Asian Paints", logo: asianPaints, permissionOnFile: false },
  { name: "Brigade Group", logo: brigade, permissionOnFile: false },
  { name: "MFAR Constructions", logo: mfar, permissionOnFile: false },
  { name: "Mythri Constructions", logo: mythri, permissionOnFile: false },
  { name: "Zhonhen System Integration", logo: zhonhen, permissionOnFile: false },
];

/** The clients whose logo may be shown: only those with both documents on file. */
export function clientsWithPermission<T extends { permissionOnFile: boolean }>(list: readonly T[]): T[] {
  return list.filter((client) => client.permissionOnFile);
}
