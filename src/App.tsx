import { Routes, Route } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/public/HomePage";
import AboutPage from "./pages/public/AboutPage";
import ResultsPage from "./pages/public/ResultsPage";
import PrivacyPage from "./pages/public/PrivacyPage";
import LoginPage from "./pages/admin/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import TicketListPage from "./pages/admin/TicketListPage";
import TicketNewPage from "./pages/admin/TicketNewPage";
import DrawPage from "./pages/admin/DrawPage";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>

      {/* Admin login — outside protected wrapper */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Protected admin routes */}
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tickets" element={<TicketListPage />} />
          <Route path="tickets/new" element={<TicketNewPage />} />
          <Route path="draw" element={<DrawPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
