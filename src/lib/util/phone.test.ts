import { describe, it, expect } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("returns null for an empty string", () => {
    expect(toE164("")).toBeNull();
  });

  it("returns null for a string with no digits", () => {
    expect(toE164("---")).toBeNull();
  });

  it("passes through a clean E.164 number unchanged", () => {
    expect(toE164("+61412345678")).toBe("+61412345678");
  });

  it("strips spaces from an E.164 number", () => {
    expect(toE164("+61 412 345 678")).toBe("+61412345678");
  });

  it("strips dashes from an E.164 number", () => {
    expect(toE164("+61-412-345-678")).toBe("+61412345678");
  });

  it("converts Australian local format (04xx) to E.164", () => {
    expect(toE164("0412345678")).toBe("+61412345678");
  });

  it("converts Australian local format with spaces", () => {
    expect(toE164("0412 345 678")).toBe("+61412345678");
  });

  it("converts 00-prefixed international format", () => {
    expect(toE164("0061412345678")).toBe("+61412345678");
  });

  it("adds + when bare country code digits are provided", () => {
    expect(toE164("61412345678")).toBe("+61412345678");
  });

  it("respects a non-default country code", () => {
    expect(toE164("02012345678", "44")).toBe("+442012345678");
  });
});