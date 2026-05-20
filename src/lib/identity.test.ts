import { describe, it, expect, vi } from "vitest";
import { resolveIdentity } from "./identity";

const makeTx = ({
  matchingSignals = [] as { id: string }[],
  customerLink = null as { customerId: string } | null,
} = {}) => ({
  customer: {
    create: vi.fn().mockResolvedValue({ id: "cust_new" }),
  },
  identitySignal: {
    findMany: vi.fn().mockResolvedValue(matchingSignals),
    createMany: vi.fn().mockResolvedValue({}),
  },
  customerSignal: {
    findFirst: vi.fn().mockResolvedValue(customerLink),
    createMany: vi.fn().mockResolvedValue({}),
  },
});

const signals = [{ type: "email" as const, value: "jane@example.com" }];

describe("resolveIdentity", () => {
  it("creates and returns a new customer id when no match is found", async () => {
    const tx = makeTx();

    const id = await resolveIdentity(tx as never, signals);

    expect(tx.customer.create).toHaveBeenCalledWith({ data: {} });
    expect(id).toBe("cust_new");
  });

  it("persists signals and links them to the new customer", async () => {
    const tx = makeTx();
    tx.identitySignal.findMany
      .mockResolvedValueOnce([])               // tier loop: no existing match
      .mockResolvedValueOnce([{ id: "sig_001" }]); // fetch back after createMany

    await resolveIdentity(tx as never, signals);

    expect(tx.identitySignal.createMany).toHaveBeenCalledWith({
      data: [{ type: "email", value: "jane@example.com" }],
      skipDuplicates: true,
    });
    expect(tx.customerSignal.createMany).toHaveBeenCalledWith({
      data: [{ signalId: "sig_001", customerId: "cust_new" }],
    });
  });

  it("returns the existing customer id when a signal matches", async () => {
    const tx = makeTx({
      matchingSignals: [{ id: "sig_001" }],
      customerLink: { customerId: "cust_existing" },
    });

    const id = await resolveIdentity(tx as never, signals);

    expect(tx.customer.create).not.toHaveBeenCalled();
    expect(id).toBe("cust_existing");
  });
});