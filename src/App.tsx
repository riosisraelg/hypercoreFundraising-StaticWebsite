import { Routes, Route, Navigate } from "react-router-dom";
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
import VerifyAdminPage from "./pages/admin/VerifyAdminPage";
import ValidatePage from "./pages/public/ValidatePage";
import RegisterPage from "./pages/public/RegisterPage";
import UserLoginPage from "./pages/public/UserLoginPage";
import UserDashboardPage from "./pages/public/UserDashboardPage";
import ReservePage from "./pages/public/ReservePage";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/validate" element={<ValidatePage />} />
        <Route path="/validate/:ticketId" element={<ValidatePage />} />
        
        {/* User Auth Portal */}
        <Route path="/login" element={<UserLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/user" element={<ProtectedRoute />}>
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="reserve/:folios" element={<ReservePage />} />
        </Route>
      </Route>

      {/* Admin login — outside protected wrapper */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Protected admin routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly={true} />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tickets" element={<TicketListPage />} />
          <Route path="tickets/new" element={<TicketNewPage />} />
          <Route path="verify" element={<VerifyAdminPage />} />
          <Route path="verify/:ticketId" element={<VerifyAdminPage />} />
          <Route path="draw" element={<DrawPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
