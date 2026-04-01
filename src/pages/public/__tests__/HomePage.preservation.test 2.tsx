/**
 * Preservation test: HomePage still passes `authMode: 'apiKey'` for public reads
 *
 * Validates: Requirements 3.2 — unauthenticated users on the public HomePage
 * SHALL CONTINUE TO use API Key authorization for read-only data operations.
 */
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

// --- Mocks (vi.hoisted ensures these exist before the hoisted vi.mock runs) ---

const { mockTicketList, mockFundraisingExtraList } = vi.hoisted(() => ({
  mockTicketList: vi.fn().mockResolvedValue({ data: [] }),
  mockFundraisingExtraList: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../../../lib/amplify-client", () => ({
  getClient: () => ({
    models: {
      Ticket: { list: mockTicketList },
      FundraisingExtra: { list: mockFundraisingExtraList },
    },
  }),
}));

// Mock FolioGrid to avoid rendering complexity
vi.mock("../../../components/FolioGrid", () => ({
  default: () => null,
}));

// Provide a minimal router context so <a> / Link elements don't break
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual };
});

// Import the component AFTER mocks are set up
import HomePage from "../HomePage";

describe("HomePage preservation — authMode: 'apiKey' for public reads", () => {
  it("calls Ticket.list with authMode 'apiKey'", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(mockTicketList).toHaveBeenCalled();
    });

    expect(mockTicketList).toHaveBeenCalledWith(
      expect.objectContaining({ authMode: "apiKey" })
    );
  });

  it("calls FundraisingExtra.list with authMode 'apiKey'", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(mockFundraisingExtraList).toHaveBeenCalled();
    });

    expect(mockFundraisingExtraList).toHaveBeenCalledWith(
      expect.objectContaining({ authMode: "apiKey" })
    );
  });
});
