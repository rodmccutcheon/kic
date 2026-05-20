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
    upsert: vi.fn().mockResolvedValue({ id: "sig_new" }),
  },
  customerSignal: {
    findMany: vi.fn().mockResolvedValue(customerLinks),
    createMany: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
  customerEvent: {
    findMany: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue({}),
  },
  mergeRecord: {
    create: vi.fn().mockResolvedValue({}),
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

    await resolveIdentity(tx as never, signals);

    expect(tx.identitySignal.upsert).toHaveBeenCalledWith({
      where: { type_value: { type: "email", value: "jane@example.com" } },
      create: { type: "email", value: "jane@example.com" },
      update: {},
    });
    expect(tx.customerSignal.createMany).toHaveBeenCalledWith({
      data: [{ signalId: "sig_new", customerId: "cust_new" }],
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

  it("creates a MergeRecord when two customers are merged", async () => {
    const tx = makeTx({ matchingSignals: [{ id: "sig_001" }] });
    tx.customerSignal.findMany
      .mockResolvedValueOnce([{ customerId: "cust_b" }, { customerId: "cust_a" }])
      .mockResolvedValueOnce([]);

    await resolveIdentity(tx as never, signals);

    expect(tx.mergeRecord.create).toHaveBeenCalledWith({
      data: {
        canonicalId: "cust_a",
        absorbedId: "cust_b",
        signals: JSON.stringify(signals),
        copiedSignalIds: "[]",
        copiedEventIds: "[]",
        confidence: "deterministic",
      },
    });
  });

  it("copies the absorbed customer's events to the canonical on merge", async () => {
    const tx = makeTx({ matchingSignals: [{ id: "sig_001" }] });
    tx.customerSignal.findMany
      .mockResolvedValueOnce([{ customerId: "cust_b" }, { customerId: "cust_a" }])
      .mockResolvedValueOnce([]);
    tx.customerEvent.findMany
      .mockResolvedValueOnce([{ eventId: "evt_001" }]);

    await resolveIdentity(tx as never, signals);

    expect(tx.customerEvent.createMany).toHaveBeenCalledWith({
      data: [{ eventId: "evt_001", customerId: "cust_a" }],
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

  it("does not re-merge an already-absorbed customer", async () => {
    const tx = makeTx({
      matchingSignals: [{ id: "sig_001" }],
      customerLinks: [{ customerId: "cust_a" }],
    });
    tx.customerSignal.findMany
      .mockResolvedValueOnce([{ customerId: "cust_a" }]) // matchTier: canonical found
      .mockResolvedValueOnce([]);                         // cascadeSweep: no conflicts (absorbed filtered out)

    const id = await resolveIdentity(tx as never, signals);

    expect(id).toBe("cust_a");
    expect(tx.mergeRecord.create).not.toHaveBeenCalled();
    expect(tx.customerSignal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer: { deletedAt: null } }),
      })
    );
  });

  it("cascades a merge when a swept signal already belongs to another customer", async () => {
    const tx = makeTx({ matchingSignals: [{ id: "sig_phone" }] });

    tx.customerSignal.findMany
      .mockResolvedValueOnce([{ customerId: "cust_sam" }])   // matchTier: phone → sam
      .mockResolvedValueOnce([{ customerId: "cust_alex" }])  // cascadeSweep: email already linked to alex
      .mockResolvedValueOnce([]);                             // mergeIntoCanonical: alex's signals to copy

    tx.identitySignal.upsert
      .mockResolvedValueOnce({ id: "sig_email" })
      .mockResolvedValueOnce({ id: "sig_phone" });

    const multiSignals = [
      { type: "email" as const, value: "alex.kim@example.com" },
      { type: "phone" as const, value: "+61433000001" },
    ];

    await resolveIdentity(tx as never, multiSignals);

    expect(tx.mergeRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ canonicalId: "cust_sam", absorbedId: "cust_alex" }),
      })
    );
  });
});