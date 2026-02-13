import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Assessments from "./pages/Assessments";
import TakeAssessment from "./pages/TakeAssessment";
import AdaptiveAssessment from "./pages/AdaptiveAssessment";
import JobRoles from "./pages/JobRoles";
import JobRoleDetail from "./pages/JobRoleDetail";
import SkillGap from "./pages/SkillGap";
import NotFound from "./pages/NotFound";
import Recommendations from "./pages/Recommendations";
import Progress from "./pages/Progress";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSkills from "./pages/admin/AdminSkills";
import AdminJobRoles from "./pages/admin/AdminJobRoles";
import AdminAssessments from "./pages/admin/AdminAssessments";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminRecommendations from "./pages/admin/AdminRecommendations";
import AdminLearningPaths from "./pages/admin/AdminLearningPaths";
import LearningPaths from "./pages/LearningPaths";
import LearningPathDetail from "./pages/LearningPathDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments"
              element={
                <ProtectedRoute>
                  <Assessments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/:id"
              element={
                <ProtectedRoute>
                  <TakeAssessment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/adaptive"
              element={
                <ProtectedRoute>
                  <AdaptiveAssessment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/job-roles"
              element={
                <ProtectedRoute>
                  <JobRoles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/job-roles/:id"
              element={
                <ProtectedRoute>
                  <JobRoleDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/skill-gap"
              element={
                <ProtectedRoute>
                  <SkillGap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recommendations"
              element={
                <ProtectedRoute>
                  <Recommendations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/skills"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSkills />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/job-roles"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminJobRoles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assessments"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminAssessments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/recommendations"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminRecommendations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/learning-paths"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLearningPaths />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            {/* Learning paths for students */}
            <Route
              path="/learning-paths"
              element={
                <ProtectedRoute>
                  <LearningPaths />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learning-paths/:id"
              element={
                <ProtectedRoute>
                  <LearningPathDetail />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
