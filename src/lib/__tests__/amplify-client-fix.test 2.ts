/**
 * [PBT-fix] Property 1: Bug Condition — verify fixed getClient() returns
 * without throwing for any call sequence.
 *
 * **Validates: Requirements 2.1, 2.3**
 */
import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

vi.mock("aws-amplify", () => ({
  Amplify: { configure: vi.fn(), getConfig: vi.fn(() => ({})) },
}));

vi.mock("aws-amplify/data", () => ({
  generateClient: vi.fn(() => ({
    models: {
      Ticket: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      FundraisingExtra: { list: vi.fn() },
      DrawResult: { list: vi.fn() },
    },
  })),
}));

const accessActionArb = fc.oneof(
  fc.constant("read-client" as const),
  fc.constant("read-models" as const),
  fc.constant("read-ticket" as const),
  fc.constant("read-fundraising" as const),
  fc.constant("read-drawresult" as const),
);

const accessSequenceArb = fc.array(accessActionArb, { minLength: 1, maxLength: 20 });

describe("[PBT-fix] Property 1 — fixed getClient() never throws", () => {
  it("for any access sequence, getClient() is always available and never throws", async () => {
    const { getClient } = await import("../amplify-client");

    fc.assert(
      fc.property(accessSequenceArb, (sequence) => {
        const client = getClient();
        const firstRef = client;

        for (const action of sequence) {
          switch (action) {
            case "read-client":
              expect(getClient()).toBeDefined();
              expect(getClient()).not.toBeNull();
              break;
            case "read-models":
              expect(getClient().models).toBeDefined();
              break;
            case "read-ticket":
              expect((getClient().models as any).Ticket).toBeDefined();
              break;
            case "read-fundraising":
              expect((getClient().models as any).FundraisingExtra).toBeDefined();
              break;
            case "read-drawresult":
              expect((getClient().models as any).DrawResult).toBeDefined();
              break;
          }
          // Singleton: always same reference
          expect(getClient()).toBe(firstRef);
        }
      }),
      { numRuns: 100 },
    );
  });
});
