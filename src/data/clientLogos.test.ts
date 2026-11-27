import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { CLIENT_LOGOS, clientsWithPermission } from "./clientLogos";
import { stripComments } from "@/lib/seo/cityBlocks";

/**
 * Client logos and names (claims inventory E2): shown only with a purchase record AND written
 * logo permission on file. None is on record, so nothing may render. When the owner supplies both
 * documents for a company, flip its flag in clientLogos.ts and update the expectation below.
 */
describe("client logos need permission on file", () => {
  it("shows only clients whose permission is on file", () => {
    const list = [
      { name: "A", permissionOnFile: true },
      { name: "B", permissionOnFile: false },
      { name: "C", permissionOnFile: true },
    ];
    expect(clientsWithPermission(list).map((c) => c.name)).toEqual(["A", "C"]);
    expect(clientsWithPermission([])).toEqual([]);
  });

  it("no client has permission on file yet, so no logo renders", () => {
    expect(clientsWithPermission(CLIENT_LOGOS)).toEqual([]);
  });

  it("keeps every logo entry and file (hidden, not deleted)", () => {
    expect(CLIENT_LOGOS.length).toBe(8);
    expect(readdirSync("src/assets/clients").length).toBe(8);
  });

  it("the portable-cabins category copy names no client", () => {
    const code = stripComments(readFileSync("src/components/products/PortableCabinsCategoryContent.tsx", "utf8"));
    const named = CLIENT_LOGOS.map((c) => c.name).filter((name) => code.includes(name));
    expect(named).toEqual([]);
  });

  it("the homepage section reads its logos only through the permission filter", () => {
    const code = stripComments(readFileSync("src/components/home/TrustedClientsSection.tsx", "utf8"));
    expect(code).toContain("clientsWithPermission(CLIENT_LOGOS)");
    expect(code).not.toContain("@/assets/clients/");
  });
});
