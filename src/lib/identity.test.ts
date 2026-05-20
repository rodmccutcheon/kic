import { describe, it, expect, vi } from "vitest";
import { resolveIdentity } from "./identity";

const makeTx = (overrides = {}) => ({
  customer: {
    create: vi.fn().mockResolvedValue({ id: "cust_new" }),
  },
  ...overrides,
});

describe("resolveIdentity", () => {
  it("creates and returns a new customer id when no match is found", async () => {
    const tx = makeTx();
    const signals = [{ type: "email" as const, value: "jane@example.com" }];

    const id = await resolveIdentity(tx as never, signals);

    expect(tx.customer.create).toHaveBeenCalledWith({ data: {} });
    expect(id).toBe("cust_new");
  });
});