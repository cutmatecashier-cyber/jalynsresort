import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ContentSync } from "./components/ContentSync";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { SmoothScroll } from "./components/SmoothScroll";
import { AuthProvider } from "./context/AuthContext";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ContactPage } from "./pages/ContactPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MembersPage } from "./pages/MembersPage";
import { ScubaDivingPage } from "./pages/ScubaDivingPage";
import { PendingApprovalPage } from "./pages/PendingApprovalPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RestaurantPage } from "./pages/RestaurantPage";
import { SpaPage } from "./pages/SpaPage";
import { SignupPage } from "./pages/SignupPage";
import { VerifyCodePage } from "./pages/VerifyCodePage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SmoothScroll />
        <ScrollToTop />
        <ContentSync />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms" element={<Navigate to="/#rooms" replace />} />
          <Route path="/spa" element={<SpaPage />} />
          <Route path="/scuba-diving" element={<ScubaDivingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/restaurant" element={<RestaurantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-code" element={<VerifyCodePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route
            path="/members"
            element={
              <ProtectedRoute roles={["admin"]}>
                <MembersPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/scuba" element={<Navigate to="/scuba-diving" replace />} />
          <Route path="/admin/users" element={<Navigate to="/members" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
