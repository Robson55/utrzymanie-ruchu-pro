import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Issues from "@/pages/Issues";
import NewIssue from "@/pages/NewIssue";
import IssueDetail from "@/pages/IssueDetail";
import Machines from "@/pages/Machines";
import MachineDetail from "@/pages/MachineDetail";
import MyTasks from "@/pages/MyTasks";
import Users from "@/pages/Users";
import Reports from "@/pages/Reports";
import PlannedWorks from "@/pages/PlannedWorks";
import SpareParts from "@/pages/SpareParts";
import DisplayBoard from "@/pages/DisplayBoard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/display" element={<DisplayBoard />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="/issues/new" element={<NewIssue />} />
              <Route path="/issues/:id" element={<IssueDetail />} />
              <Route path="/machines" element={<Machines />} />
              <Route path="/machines/:id" element={<MachineDetail />} />
              <Route path="/my-tasks" element={<MyTasks />} />
              <Route path="/users" element={<Users />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/planned-works" element={<PlannedWorks />} />
              <Route path="/spare-parts" element={<SpareParts />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
