/**
 * [PBT-preservation] Property 2: Preservation — verify singleton reference
 * equality across any number of getClient() calls.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
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

describe("[PBT-preservation] Property 2 — singleton reference equality", () => {
  it("for any N calls (1–50), getClient() always returns the same reference", async () => {
    const { getClient } = await import("../amplify-client");
    const { generateClient } = await import("aws-amplify/data");

    const baseClient = getClient();
    vi.mocked(generateClient).mockClear();

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (n) => {
        for (let i = 0; i < n; i++) {
          expect(getClient()).toBe(baseClient);
        }
        // generateClient should never be called again after first lazy init
        expect(vi.mocked(generateClient).mock.calls.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});
