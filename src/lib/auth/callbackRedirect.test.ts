import { describe, it, expect } from "vitest";
import { publicOrigin, safeNextPath } from "./callbackRedirect";

const h = (o: Record<string, string>) => new Headers(o);

describe("publicOrigin — never the server's internal listen address", () => {
  it("prefers a valid NEXT_PUBLIC_SITE_URL", () => {
    expect(publicOrigin(h({ host: "localhost:3000" }), { NEXT_PUBLIC_SITE_URL: "https://portableofficecabin.com/" })).toBe(
      "https://portableofficecabin.com",
    );
  });
  it("ignores an invalid NEXT_PUBLIC_SITE_URL", () => {
    expect(publicOrigin(h({ host: "portableofficecabin.com" }), { NEXT_PUBLIC_SITE_URL: "not a url" })).toBe(
      "https://portableofficecabin.com",
    );
    expect(publicOrigin(h({}), { NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" })).toBe("https://portableofficecabin.com");
  });
  it("uses the forwarded/Host header only for the site's own hosts", () => {
    expect(publicOrigin(h({ "x-forwarded-host": "www.portableofficecabin.com" }), {})).toBe("https://www.portableofficecabin.com");
    expect(publicOrigin(h({ host: "portableofficecabin.com" }), {})).toBe("https://portableofficecabin.com");
  });
  it("falls back to the canonical site for an unknown or spoofed host", () => {
    expect(publicOrigin(h({ host: "evil.example" }), {})).toBe("https://portableofficecabin.com");
    expect(publicOrigin(h({}), {})).toBe("https://portableofficecabin.com");
  });
  it("keeps local development working", () => {
    expect(publicOrigin(h({ host: "localhost:3000" }), {})).toBe("http://localhost:3000");
    expect(publicOrigin(h({ host: "127.0.0.1:3871", "x-forwarded-proto": "https" }), {})).toBe("https://127.0.0.1:3871");
  });
});

describe("safeNextPath — same-site paths only", () => {
  it("keeps ordinary paths with query strings", () => {
    expect(safeNextPath("/my-account")).toBe("/my-account");
    expect(safeNextPath("/checkout?step=2")).toBe("/checkout?step=2");
  });
  it("rejects everything that could leave the site", () => {
    for (const bad of ["//evil.example", "/\\evil.example", "@evil.example", "https://evil.example", "evil.example", "/x\r\nLocation: y", "/\\"]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
  it("defaults to the homepage", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});
