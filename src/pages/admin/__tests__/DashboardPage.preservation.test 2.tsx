/**
 * Preservation test: DashboardPage uses default auth mode (no explicit `authMode`)
 *
 * Validates: Requirements 3.1 — admin pages SHALL CONTINUE TO use the default
 * Cognito User Pool authorization, meaning NO explicit `authMode` is passed
 * to data operations.
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

// Stub react-router-dom's Link so it renders without a Router context
vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

// Import the component AFTER mocks are set up
import DashboardPage from "../DashboardPage";

describe("DashboardPage preservation — default auth mode (no explicit authMode)", () => {
  it("calls Ticket.list WITHOUT an authMode property", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockTicketList).toHaveBeenCalled();
    });

    // DashboardPage should call list() with no args or args without authMode
    const calls = mockTicketList.mock.calls;
    for (const args of calls) {
      if (args.length > 0 && args[0] != null) {
        expect(args[0]).not.toHaveProperty("authMode");
      }
    }
  });

  it("calls FundraisingExtra.list WITHOUT an authMode property", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockFundraisingExtraList).toHaveBeenCalled();
    });

    // DashboardPage should call list() with no args or args without authMode
    const calls = mockFundraisingExtraList.mock.calls;
    for (const args of calls) {
      if (args.length > 0 && args[0] != null) {
        expect(args[0]).not.toHaveProperty("authMode");
      }
    }
  });
});
