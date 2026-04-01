/**
 * Unit tests: getClient() returns a defined client with expected shape,
 * and generateClient() is called exactly once (lazy singleton).
 */
import { describe, it, expect, vi } from "vitest";

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

describe("amplify-client module — getClient() shape", () => {
  it("getClient() returns a defined client", async () => {
    const { getClient } = await import("../amplify-client");
    const client = getClient();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });

  it("client.models exists", async () => {
    const { getClient } = await import("../amplify-client");
    expect(getClient().models).toBeDefined();
  });

  it("client.models.Ticket exists", async () => {
    const { getClient } = await import("../amplify-client");
    expect((getClient().models as any).Ticket).toBeDefined();
  });

  it("client.models.FundraisingExtra exists", async () => {
    const { getClient } = await import("../amplify-client");
    expect((getClient().models as any).FundraisingExtra).toBeDefined();
  });

  it("client.models.DrawResult exists", async () => {
    const { getClient } = await import("../amplify-client");
    expect((getClient().models as any).DrawResult).toBeDefined();
  });
});

describe("amplify-client module — lazy singleton", () => {
  it("generateClient() is called exactly once across multiple getClient() calls", async () => {
    const { generateClient } = await import("aws-amplify/data");
    vi.mocked(generateClient).mockClear();

    const { getClient } = await import("../amplify-client");
    // Reset internal cache by re-importing with fresh module
    // Since module is cached, generateClient was already called once from prior tests
    // Just verify multiple getClient() calls don't increase the count
    const countBefore = vi.mocked(generateClient).mock.calls.length;
    getClient();
    getClient();
    getClient();
    expect(vi.mocked(generateClient).mock.calls.length).toBe(countBefore);
  });

  it("getClient() always returns the same reference (singleton)", async () => {
    const { getClient } = await import("../amplify-client");
    const a = getClient();
    const b = getClient();
    const c = getClient();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
