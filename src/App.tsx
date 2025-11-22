import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import PatientList from "./pages/PatientList";

const queryClient = new QueryClient();

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  // Don't show nav on the landing page if it's separate, but here we'll make it consistent
  // Or maybe we want a sidebar? For now, let's stick to the top nav style from the HTML files.
  
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <nav className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-4">
                    {/* <img src="/nhce_logo.png" alt="NHCE Logo" className="h-10 w-auto" /> */}
                    <div>
                        <h1 className="text-xl font-bold">NHCE Hospital Management</h1>
                        <p className="text-blue-200 text-sm">
                          {location.pathname === '/dashboard' ? 'Dashboard' : 
                           location.pathname === '/patients' ? 'Patient List' : 'Portal'}
                        </p>
                    </div>
                </div>
                
                <div className="flex space-x-1 overflow-x-auto">
                    <Link to="/dashboard" className={`px-4 py-2 rounded-lg transition-colors ${location.pathname === '/dashboard' ? 'bg-blue-700 font-medium' : 'hover:bg-blue-700'}`}>Dashboard</Link>
                    <Link to="/patients" className={`px-4 py-2 rounded-lg transition-colors ${location.pathname === '/patients' ? 'bg-blue-700 font-medium' : 'hover:bg-blue-700'}`}>Patients</Link>
                    <Link to="/vitals" className="hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors opacity-50 cursor-not-allowed" title="Coming Soon">Vitals</Link>
                    <Link to="/prescriptions" className="hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors opacity-50 cursor-not-allowed" title="Coming Soon">Prescriptions</Link>
                </div>
                
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-sm">Server Online</span>
                    </div>
                </div>
            </div>
        </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={(import.meta as any).env.BASE_URL || "/"}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<PatientList />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
