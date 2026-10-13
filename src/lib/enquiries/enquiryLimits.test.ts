// node:test + node:assert directly (not the vitest-compat shim), so tsc needs no "vitest" types.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ENQUIRY_DB_LIMITS, enquiryLengthError, type EnquiryLimitedField } from "./enquiryLimits";

/**
 * The browser-side limits must equal the database constraint, or a form could pass in the browser
 * and then be refused by public.enquiries (or reject input the database would accept).
 */
const MIGRATION = join("supabase", "migrations", "20261012120000_enquiries_insert_hardening.sql");

function constraintLimits(): Record<string, { min: number; max: number }> {
  const sql = readFileSync(MIGRATION, "utf8");
  const out: Record<string, { min: number; max: number }> = {};
  for (const m of sql.matchAll(/char_length\((\w+)\) between (\d+) and (\d+)/g)) out[m[1]] = { min: Number(m[2]), max: Number(m[3]) };
  for (const m of sql.matchAll(/\((\w+) is null or char_length\(\w+\) <= (\d+)\)/g)) out[m[1]] = { min: 0, max: Number(m[2]) };
  return out;
}

describe("enquiry limits — browser and database agree", () => {
  it("covers exactly the columns the constraint caps", () => {
    assert.deepEqual(Object.keys(constraintLimits()).sort(), Object.keys(ENQUIRY_DB_LIMITS).sort());
  });

  it("uses the same minimum and maximum for every column", () => {
    const db = constraintLimits();
    for (const field of Object.keys(ENQUIRY_DB_LIMITS) as EnquiryLimitedField[]) {
      assert.deepEqual({ ...ENQUIRY_DB_LIMITS[field] }, db[field], field);
    }
  });
});

describe("enquiryLengthError", () => {
  const ok = { name: "Ravi Kumar", email: "ravi@example.com", message: "Need a 20 ft site office", phone: null, company: null };

  it("accepts a normal enquiry and null optional fields", () => {
    assert.equal(enquiryLengthError(ok), null);
  });

  it("accepts every field at exactly its maximum", () => {
    const row: Record<string, string> = {};
    for (const [field, { max }] of Object.entries(ENQUIRY_DB_LIMITS)) row[field] = "x".repeat(max);
    assert.equal(enquiryLengthError(row), null);
  });

  it("refuses a message one character over the database cap, with a readable reason", () => {
    assert.match(enquiryLengthError({ ...ok, message: "x".repeat(8001) }) ?? "", /Message is too long/);
  });

  it("refuses a name over 200 characters", () => {
    assert.match(enquiryLengthError({ ...ok, name: "x".repeat(201) }) ?? "", /Name is too long/);
  });

  it("refuses an empty message, which the database would reject", () => {
    assert.match(enquiryLengthError({ ...ok, message: "" }) ?? "", /Please enter your message/);
  });
});
