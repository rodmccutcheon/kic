import { describe, it, expect, vi } from "vitest";
import { resolveIdentity } from "./identity";

const makeTx = ({
  signals = [] as { id: string }[],
  customerLink = null as { customerId: string } | null,
} = {}) => ({
  customer: {
    create: vi.fn().mockResolvedValue({ id: "cust_new" }),
  },
  identitySignal: {
    findMany: vi.fn().mockResolvedValue(signals),
  },
  customerSignal: {
    findFirst: vi.fn().mockResolvedValue(customerLink),
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

  it("returns the existing customer id when a signal matches", async () => {
    const tx = makeTx({
      signals: [{ id: "sig_001" }],
      customerLink: { customerId: "cust_existing" },
    });

    const id = await resolveIdentity(tx as never, signals);

    expect(tx.customer.create).not.toHaveBeenCalled();
    expect(id).toBe("cust_existing");
  });
});