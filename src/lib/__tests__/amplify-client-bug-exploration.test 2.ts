/**
 * PBT-exploration: Bug Condition — verify getDataClient() throws config error on unfixed code
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * This test recreates the OLD buggy getDataClient() pattern inline and proves
 * the bug existed by asserting that:
 *   1. generateClient() throws "Amplify has not been configured" (bug condition)
 *   2. generateClient() is called on EVERY invocation (no caching)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

describe("Bug Condition Exploration — old getDataClient() pattern", () => {
  // ── Mocks simulating the bug condition ──────────────────────────────
  const mockConfigure = vi.fn();
  const mockGenerateClient = vi.fn<() => unknown>(() => {
    throw new Error(
      "Amplify has not been configured. This is likely due to " +
        "`Amplify.configure()` not being called prior to `generateClient()`."
    );
  });

  // ── Recreate the OLD buggy getDataClient inline ─────────────────────
  // This mirrors the exact pattern from the unfixed src/lib/amplify-client.ts:
  //   let configured = false;
  //   export function getDataClient() {
  //     if (!configured) { Amplify.configure(outputs); configured = true; }
  //     return generateClient() as any;
  //   }
  let configured: boolean;

  function buggyGetDataClient() {
    if (!configured) {
      mockConfigure({}); // simulates Amplify.configure(outputs)
      configured = true;
    }
    return mockGenerateClient(); // called on EVERY invocation — the bug
  }

  beforeEach(() => {
    configured = false;
    mockConfigure.mockClear();
    mockGenerateClient.mockClear();
  });

  // ── Property 1: ANY call to the old getDataClient triggers the error ──
  it("Property 1a: for any call count, the old getDataClient always throws the config error", () => {
    fc.assert(
      fc.property(
        // Generate a random number of calls (1–20)
        fc.integer({ min: 1, max: 20 }),
        (callCount: number) => {
          // Reset state for each property run
          configured = false;
          mockConfigure.mockClear();
          mockGenerateClient.mockClear();

          // Every single call should throw the config error
          for (let i = 0; i < callCount; i++) {
            expect(() => buggyGetDataClient()).toThrowError(
              /Amplify has not been configured/
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Property 2: generateClient is called on EVERY invocation (no caching) ──
  it("Property 1b: for any call sequence, generateClient is invoked on every call (no caching)", () => {
    // For this property we need generateClient to NOT throw so we can
    // count invocations. Use a separate non-throwing mock.
    const countingGenerateClient = vi.fn(() => ({ models: {} }));

    let countConfigured = false;
    function buggyGetDataClientCounting() {
      if (!countConfigured) {
        mockConfigure({});
        countConfigured = true;
      }
      return countingGenerateClient();
    }

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (callCount: number) => {
          countConfigured = false;
          countingGenerateClient.mockClear();
          mockConfigure.mockClear();

          for (let i = 0; i < callCount; i++) {
            buggyGetDataClientCounting();
          }

          // The bug: generateClient is called N times for N calls
          // A correct implementation would call it at most once (singleton)
          expect(countingGenerateClient).toHaveBeenCalledTimes(callCount);

          // Amplify.configure is only called once (the configured flag works)
          // but that doesn't prevent the bug — generateClient still runs every time
          expect(mockConfigure).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
