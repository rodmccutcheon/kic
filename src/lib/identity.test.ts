import { describe, it, expect, vi } from "vitest";
import { resolveIdentity } from "./identity";

const makeTx = ({
  matchingSignals = [] as { id: string }[],
  customerLinks = [] as { customerId: string }[],
} = {}) => ({
  customer: {
    create: vi.fn().mockResolvedValue({ id: "cust_new" }),
    updateMany: vi.fn().mockResolvedValue({}),
  },
  identitySignal: {
    findMany: vi.fn().mockResolvedValue(matchingSignals),
    createMany: vi.fn().mockResolvedValue({}),
  },
  customerSignal: {
    findMany: vi.fn().mockResolvedValue(customerLinks),
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
      customerLinks: [{ customerId: "cust_existing" }],
    });

    const id = await resolveIdentity(tx as never, signals);

    expect(tx.customer.create).not.toHaveBeenCalled();
    expect(id).toBe("cust_existing");
  });

  it("merges and returns a canonical id when two signals match different customers", async () => {
    const tx = makeTx({
      matchingSignals: [{ id: "sig_001" }, { id: "sig_002" }],
      customerLinks: [{ customerId: "cust_b" }, { customerId: "cust_a" }],
    });

    const id = await resolveIdentity(tx as never, signals);

    expect(id).toBe("cust_a"); // sorted: canonical is alphabetically first
    expect(tx.customer.create).not.toHaveBeenCalled();
  });

  it("copies the absorbed customer's signals to the canonical on merge", async () => {
    const tx = makeTx({ matchingSignals: [{ id: "sig_001" }] });
    tx.customerSignal.findMany
      .mockResolvedValueOnce([{ customerId: "cust_b" }, { customerId: "cust_a" }]) // tier loop
      .mockResolvedValueOnce([{ signalId: "sig_b_001" }]);                          // absorbed signals

    await resolveIdentity(tx as never, signals);

    expect(tx.customerSignal.createMany).toHaveBeenCalledWith({
      data: [{ signalId: "sig_b_001", customerId: "cust_a" }],
    });
  });

  it("soft-deletes the absorbed customer after merging", async () => {
    const tx = makeTx({ matchingSignals: [{ id: "sig_001" }] });
    tx.customerSignal.findMany
      .mockResolvedValueOnce([{ customerId: "cust_b" }, { customerId: "cust_a" }])
      .mockResolvedValueOnce([]);

    await resolveIdentity(tx as never, signals);

    expect(tx.customer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["cust_b"] } },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("returns one id when two signals match the same customer", async () => {
    const tx = makeTx({
      matchingSignals: [{ id: "sig_001" }, { id: "sig_002" }],
      customerLinks: [{ customerId: "cust_a" }, { customerId: "cust_a" }],
    });

    const id = await resolveIdentity(tx as never, signals);

    expect(id).toBe("cust_a");
    expect(tx.customer.create).not.toHaveBeenCalled();
  });
});