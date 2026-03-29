import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DrawPage from "../DrawPage";
import { renderWithRouter } from "../../../test/render";
import * as apiModule from "../../../lib/api";

describe("DrawPage", () => {
  describe("when no draw has been executed", () => {
    it("shows execute button", async () => {
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({ results: [], message: "" });

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ejecutar sorteo/i })).toBeInTheDocument();
      });
    });

    it("executes draw and shows winners", async () => {
      const user = userEvent.setup();
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({ results: [] });

      const winners = [
        { id: "1", folio: "HC-001", full_name: "Winner 1", phone: "111", prize_rank: 1, prize_name: "$5,000 MXN", drawn_at: "2026-03-29" },
        { id: "2", folio: "HC-002", full_name: "Winner 2", phone: "222", prize_rank: 2, prize_name: "JBL Flip 7", drawn_at: "2026-03-29" },
        { id: "3", folio: "HC-003", full_name: "Winner 3", phone: "333", prize_rank: 3, prize_name: "Botella Maestro Dobel", drawn_at: "2026-03-29" },
      ];
      vi.spyOn(apiModule.api, "post").mockResolvedValueOnce(winners);

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ejecutar sorteo/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /ejecutar sorteo/i }));

      await waitFor(() => {
        expect(screen.getByText("HC-001")).toBeInTheDocument();
      });
      expect(screen.getByText("HC-002")).toBeInTheDocument();
      expect(screen.getByText("HC-003")).toBeInTheDocument();
      expect(screen.getByText("Winner 1")).toBeInTheDocument();
    });
  });

  describe("when draw already exists", () => {
    it("shows existing results and rerun option", async () => {
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({
        results: [
          { folio: "HC-010", prize_rank: 1, prize_name: "$5,000 MXN" },
          { folio: "HC-020", prize_rank: 2, prize_name: "JBL Flip 7" },
          { folio: "HC-030", prize_rank: 3, prize_name: "Botella Maestro Dobel" },
        ],
      });

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByText("HC-010")).toBeInTheDocument();
      });
      expect(screen.getByText("HC-020")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /re-ejecutar sorteo/i })).toBeInTheDocument();
    });

    it("shows confirmation input when rerun is clicked", async () => {
      const user = userEvent.setup();
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({
        results: [
          { folio: "HC-010", prize_rank: 1, prize_name: "P1" },
          { folio: "HC-020", prize_rank: 2, prize_name: "P2" },
          { folio: "HC-030", prize_rank: 3, prize_name: "P3" },
        ],
      });

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /re-ejecutar sorteo/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /re-ejecutar sorteo/i }));

      expect(screen.getByPlaceholderText(/rewrite draw/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
    });

    it("rejects rerun with wrong confirmation phrase", async () => {
      const user = userEvent.setup();
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({
        results: [
          { folio: "HC-010", prize_rank: 1, prize_name: "P1" },
          { folio: "HC-020", prize_rank: 2, prize_name: "P2" },
          { folio: "HC-030", prize_rank: 3, prize_name: "P3" },
        ],
      });

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /re-ejecutar sorteo/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /re-ejecutar sorteo/i }));
      await user.type(screen.getByPlaceholderText(/rewrite draw/i), "wrong phrase");
      await user.click(screen.getByRole("button", { name: /confirmar/i }));

      expect(screen.getByRole("alert")).toHaveTextContent(/rewrite draw/i);
    });

    it("executes rerun with correct confirmation phrase", async () => {
      const user = userEvent.setup();
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({
        results: [
          { folio: "HC-010", prize_rank: 1, prize_name: "P1" },
          { folio: "HC-020", prize_rank: 2, prize_name: "P2" },
          { folio: "HC-030", prize_rank: 3, prize_name: "P3" },
        ],
      });

      const newWinners = [
        { id: "4", folio: "HC-040", full_name: "New 1", phone: "444", prize_rank: 1, prize_name: "$5,000 MXN", drawn_at: "2026-03-29" },
        { id: "5", folio: "HC-050", full_name: "New 2", phone: "555", prize_rank: 2, prize_name: "JBL Flip 7", drawn_at: "2026-03-29" },
        { id: "6", folio: "HC-060", full_name: "New 3", phone: "666", prize_rank: 3, prize_name: "Botella", drawn_at: "2026-03-29" },
      ];
      vi.spyOn(apiModule.api, "post").mockResolvedValueOnce(newWinners);

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /re-ejecutar sorteo/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /re-ejecutar sorteo/i }));
      await user.type(screen.getByPlaceholderText(/rewrite draw/i), "rewrite draw");
      await user.click(screen.getByRole("button", { name: /confirmar/i }));

      await waitFor(() => {
        expect(screen.getByText("HC-040")).toBeInTheDocument();
      });
      expect(screen.getByText("New 1")).toBeInTheDocument();
    });

    it("cancels rerun and hides confirmation input", async () => {
      const user = userEvent.setup();
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({
        results: [
          { folio: "HC-010", prize_rank: 1, prize_name: "P1" },
          { folio: "HC-020", prize_rank: 2, prize_name: "P2" },
          { folio: "HC-030", prize_rank: 3, prize_name: "P3" },
        ],
      });

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /re-ejecutar sorteo/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /re-ejecutar sorteo/i }));
      expect(screen.getByPlaceholderText(/rewrite draw/i)).toBeInTheDocument();

      // Click the "Cancelar" button inside the rerun section
      const cancelButtons = screen.getAllByRole("button", { name: /cancelar/i });
      await user.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByPlaceholderText(/rewrite draw/i)).not.toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("shows error when draw execution fails (no active tickets)", async () => {
      const user = userEvent.setup();
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({ results: [] });
      vi.spyOn(apiModule.api, "post").mockRejectedValueOnce(
        new apiModule.ApiError(400, { detail: "No hay boletos activos." })
      );

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ejecutar sorteo/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /ejecutar sorteo/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/no hay boletos activos/i);
      });
    });

    it("shows conflict error when draw already executed (409)", async () => {
      const user = userEvent.setup();
      vi.spyOn(apiModule.api, "get").mockResolvedValueOnce({ results: [] });
      vi.spyOn(apiModule.api, "post").mockRejectedValueOnce(
        new apiModule.ApiError(409, { detail: "Draw already executed" })
      );

      renderWithRouter(<DrawPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ejecutar sorteo/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /ejecutar sorteo/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/ya fue ejecutado/i);
      });
    });
  });
});
