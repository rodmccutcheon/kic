import { describe, expect, it, vi, beforeEach } from "vitest";
import { ingestEvent } from "./ingest";
import { EventDescriptor, RawSignal } from "@/types";

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn().mockResolvedValue({});
  return { mockCreate };
});

vi.mock("./db", () => ({
  prisma: {
    $transaction: vi.fn().mockImplementation(
      (cb: (tx: { event: { create: typeof mockCreate } }) => Promise<void>) =>
        cb({ event: { create: mockCreate } }),
    ),
  },
}));

const signals: RawSignal[] = [{ type: "email", value: "jane@example.com" }];
const descriptor: EventDescriptor = {
  externalId: "mb_booking_001",
  source: "mindbody",
  type: "booking.created",
  payload: {},
  occurredAt: new Date("2024-11-05T08:00:00Z"),
};

describe("ingestEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the event with correct fields", async () => {
    await ingestEvent(signals, descriptor);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "mindbody",
        type: "booking.created",
        externalId: "mb_booking_001",
        occurredAt: new Date("2024-11-05T08:00:00Z"),
      }),
    });
  });
});
