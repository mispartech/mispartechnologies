import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Register from "./pages/Register";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DjangoAuthProvider } from "@/contexts/DjangoAuthContext";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import MembersList from "./pages/dashboard/MembersList";
import TempMembersList from "./pages/dashboard/TempMembersList";
import AttendanceCapture from "./pages/dashboard/AttendanceCapture";
import AttendanceLogs from "./pages/dashboard/AttendanceLogs";
import AttendanceHistory from "./pages/dashboard/AttendanceHistory";
import DepartmentsList from "./pages/dashboard/DepartmentsList";
import ProfileSettings from "./pages/dashboard/ProfileSettings";
import FaceGallery from "./pages/dashboard/FaceGallery";
import Reports from "./pages/dashboard/Reports";
import MyAttendanceHistory from "./pages/dashboard/MyAttendanceHistory";
import OrganizationSettings from "./pages/dashboard/OrganizationSettings";
import AdminManagement from "./pages/dashboard/AdminManagement";
import ActivityLogs from "./pages/dashboard/ActivityLogs";
import ScheduleManagement from "./pages/dashboard/ScheduleManagement";
import SiteManagement from "./pages/dashboard/SiteManagement";
import FaceEnrollment from "./pages/dashboard/FaceEnrollment";
import PageWrapper from "./components/PageWrapper";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DjangoAuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <PageWrapper>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/register" element={<Register />} />
              
              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardRouter />} />
                <Route path="face-enrollment" element={<FaceEnrollment />} />
                <Route path="members" element={<MembersList />} />
                <Route path="temp-members" element={<TempMembersList />} />
                <Route path="attendance" element={<AttendanceCapture />} />
                <Route path="attendance-logs" element={<AttendanceLogs />} />
                <Route path="attendance-history" element={<AttendanceHistory />} />
                <Route path="departments" element={<DepartmentsList />} />
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="my-attendance" element={<MyAttendanceHistory />} />
                <Route path="face-gallery" element={<FaceGallery />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<OrganizationSettings />} />
                <Route path="admin-management" element={<AdminManagement />} />
                <Route path="activity-logs" element={<ActivityLogs />} />
                <Route path="schedules" element={<ScheduleManagement />} />
                <Route path="site-management" element={<SiteManagement />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageWrapper>
        </TooltipProvider>
      </BrowserRouter>
    </DjangoAuthProvider>
  </QueryClientProvider>
);

export default App;
