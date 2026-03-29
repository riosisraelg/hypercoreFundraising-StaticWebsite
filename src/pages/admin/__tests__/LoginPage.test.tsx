import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "../LoginPage";
import * as apiModule from "../../../lib/api";

function DashboardStub() {
  return <div data-testid="dashboard">Dashboard reached</div>;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/admin/login"]}>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<DashboardStub />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders login form with username and password fields", () => {
    renderLogin();

    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it("both fields are required", () => {
    renderLogin();

    expect(screen.getByLabelText(/usuario/i)).toBeRequired();
    expect(screen.getByLabelText(/contraseña/i)).toBeRequired();
  });

  it("navigates to dashboard on successful login", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.api, "post").mockResolvedValueOnce({
      access: "fake-token",
      refresh: "fake-refresh",
    });
    const setTokenSpy = vi.spyOn(apiModule, "setToken");

    renderLogin();

    await user.type(screen.getByLabelText(/usuario/i), "admin");
    await user.type(screen.getByLabelText(/contraseña/i), "secret");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(setTokenSpy).toHaveBeenCalledWith("fake-token");
  });

  it("shows error on invalid credentials (401)", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.api, "post").mockRejectedValueOnce(
      new apiModule.ApiError(401, { detail: "Invalid credentials" })
    );

    renderLogin();

    await user.type(screen.getByLabelText(/usuario/i), "wrong");
    await user.type(screen.getByLabelText(/contraseña/i), "wrong");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/credenciales inválidas/i);
    });
  });

  it("shows connection error on network failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.api, "post").mockRejectedValueOnce(new Error("Network error"));

    renderLogin();

    await user.type(screen.getByLabelText(/usuario/i), "admin");
    await user.type(screen.getByLabelText(/contraseña/i), "pass");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/error de conexión/i);
    });
  });

  it("disables button while loading", async () => {
    const user = userEvent.setup();
    let resolveLogin!: (v: unknown) => void;
    vi.spyOn(apiModule.api, "post").mockReturnValueOnce(
      new Promise((resolve) => { resolveLogin = resolve; })
    );

    renderLogin();

    await user.type(screen.getByLabelText(/usuario/i), "admin");
    await user.type(screen.getByLabelText(/contraseña/i), "pass");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getByRole("button", { name: /ingresando/i })).toBeDisabled();

    resolveLogin({ access: "t", refresh: "r" });
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
  });
});
