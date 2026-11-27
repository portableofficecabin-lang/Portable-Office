import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { COMPANY } from "../company";

/**
 * public/llms.txt is a static file, so it cannot import company.ts. This test keeps its contact
 * line on the verified values held there: the main phone and the customer e-mail.
 *
 * info@portableofficecabin.com is not a company address in company.ts, and the enquiry
 * notification function dropped it as a stale recipient, so no other @portableofficecabin.com
 * address may appear in the file.
 */
describe("public/llms.txt contact line", () => {
  const text = readFileSync("public/llms.txt", "utf8");
  const contact = text.split(/\r?\n/).find((line) => line.startsWith("Contact:")) ?? "";

  it("has a contact line", () => {
    expect(contact).toBeTruthy();
  });

  it("uses the main phone and the customer e-mail from company.ts", () => {
    expect(contact).toContain(COMPANY.phones[0].display);
    expect(contact).toContain(COMPANY.email.sales);
  });

  it("names no other company e-mail address", () => {
    const addresses = text.match(/[\w.+-]+@portableofficecabin\.com/g) ?? [];
    expect(addresses.filter((address) => address !== COMPANY.email.sales)).toEqual([]);
  });
});
