import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import MembersList from "./pages/dashboard/MembersList";
import TempMembersList from "./pages/dashboard/TempMembersList";
import AttendanceCapture from "./pages/dashboard/AttendanceCapture";
import AttendanceLogs from "./pages/dashboard/AttendanceLogs";
import DepartmentsList from "./pages/dashboard/DepartmentsList";
import ProfileSettings from "./pages/dashboard/ProfileSettings";
import FaceGallery from "./pages/dashboard/FaceGallery";
import Reports from "./pages/dashboard/Reports";
import OrganizationSettings from "./pages/dashboard/OrganizationSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="members" element={<MembersList />} />
            <Route path="temp-members" element={<TempMembersList />} />
            <Route path="attendance" element={<AttendanceCapture />} />
            <Route path="attendance-logs" element={<AttendanceLogs />} />
            <Route path="departments" element={<DepartmentsList />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="face-gallery" element={<FaceGallery />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<OrganizationSettings />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
