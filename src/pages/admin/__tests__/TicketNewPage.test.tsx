import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketNewPage from "../TicketNewPage";
import { renderWithRouter } from "../../../test/render";
import * as apiModule from "../../../lib/api";

describe("TicketNewPage", () => {
  it("renders the registration form", () => {
    renderWithRouter(<TicketNewPage />);

    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrar boleto/i })).toBeInTheDocument();
  });

  it("both fields are required", () => {
    renderWithRouter(<TicketNewPage />);

    expect(screen.getByLabelText(/nombre completo/i)).toBeRequired();
    expect(screen.getByLabelText(/teléfono/i)).toBeRequired();
  });

  it("name field has maxLength 200", () => {
    renderWithRouter(<TicketNewPage />);

    expect(screen.getByLabelText(/nombre completo/i)).toHaveAttribute("maxLength", "200");
  });

  it("shows ticket details on successful registration", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.api, "post").mockResolvedValueOnce({
      id: "uuid-1",
      folio: "HC-001",
      full_name: "Juan Perez",
      phone: "+521234567890",
      status: "active",
      download_links: {
        pdf: "/api/tickets/uuid-1/download/pdf",
        wallet: "/api/tickets/uuid-1/download/wallet",
        google_wallet: "/api/tickets/uuid-1/download/google_wallet",
      },
    });

    renderWithRouter(<TicketNewPage />);

    await user.type(screen.getByLabelText(/nombre completo/i), "Juan Perez");
    await user.type(screen.getByLabelText(/teléfono/i), "+521234567890");
    await user.click(screen.getByRole("button", { name: /registrar boleto/i }));

    await waitFor(() => {
      expect(screen.getByText("HC-001")).toBeInTheDocument();
    });
    expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    expect(screen.getByText("+521234567890")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /descargar pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrar otro boleto/i })).toBeInTheDocument();
  });

  it("shows validation error from API", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.api, "post").mockRejectedValueOnce(
      new apiModule.ApiError(400, { full_name: ["Este campo es requerido."] })
    );

    renderWithRouter(<TicketNewPage />);

    await user.type(screen.getByLabelText(/nombre completo/i), "x");
    await user.type(screen.getByLabelText(/teléfono/i), "123");
    await user.click(screen.getByRole("button", { name: /registrar boleto/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/este campo es requerido/i);
    });
  });

  it("shows connection error on network failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.api, "post").mockRejectedValueOnce(new Error("Network error"));

    renderWithRouter(<TicketNewPage />);

    await user.type(screen.getByLabelText(/nombre completo/i), "Test");
    await user.type(screen.getByLabelText(/teléfono/i), "123");
    await user.click(screen.getByRole("button", { name: /registrar boleto/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/error de conexión/i);
    });
  });

  it("returns to form when 'register another' is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.api, "post").mockResolvedValueOnce({
      id: "uuid-1",
      folio: "HC-001",
      full_name: "Test",
      phone: "123",
      status: "active",
      download_links: { pdf: "", wallet: "", google_wallet: "" },
    });

    renderWithRouter(<TicketNewPage />);

    await user.type(screen.getByLabelText(/nombre completo/i), "Test");
    await user.type(screen.getByLabelText(/teléfono/i), "123");
    await user.click(screen.getByRole("button", { name: /registrar boleto/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /registrar otro boleto/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /registrar otro boleto/i }));

    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrar boleto/i })).toBeInTheDocument();
  });

  it("disables submit button while loading", async () => {
    const user = userEvent.setup();
    let resolvePost!: (v: unknown) => void;
    vi.spyOn(apiModule.api, "post").mockReturnValueOnce(
      new Promise((resolve) => { resolvePost = resolve; })
    );

    renderWithRouter(<TicketNewPage />);

    await user.type(screen.getByLabelText(/nombre completo/i), "Test");
    await user.type(screen.getByLabelText(/teléfono/i), "123");
    await user.click(screen.getByRole("button", { name: /registrar boleto/i }));

    expect(screen.getByRole("button", { name: /registrando/i })).toBeDisabled();

    resolvePost({
      id: "1", folio: "HC-001", full_name: "Test", phone: "123",
      status: "active", download_links: { pdf: "", wallet: "", google_wallet: "" },
    });
  });
});
