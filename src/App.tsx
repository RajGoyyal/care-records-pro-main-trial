import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientRegistrationPage from './pages/PatientRegistration';
import VitalsPage from './pages/Vitals';
import PrescriptionsPage from './pages/Prescriptions';
import PrescriptionManagementPage from './pages/PrescriptionManagement';
import ExportDataPage from './pages/ExportData';
import CaseReportsPage from './pages/CaseReports';

const queryClient = new QueryClient();

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen">
      <nav className="bg-white/80 backdrop-blur-md shadow-lg shadow-blue-100/50 border-b border-blue-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <span className="text-white font-bold text-xl">+</span>
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                    NHCE Clinic
                  </span>
                  <p className="text-xs text-gray-500">Health Management System</p>
                </div>
              </div>
              <div className="hidden sm:flex sm:space-x-1 items-center">
                <Link to="/dashboard" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${location.pathname === '/dashboard' || location.pathname === '/' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/50' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}>
                  📊 Dashboard
                </Link>
                <Link to="/patients" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${location.pathname === '/patients' ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/50' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-600'}`}>
                  👥 Patients
                </Link>
                <Link to="/vitals" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${location.pathname === '/vitals' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/50' : 'text-gray-600 hover:bg-green-50 hover:text-green-600'}`}>
                  💗 Vitals
                </Link>
                <Link to="/prescriptions" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${location.pathname === '/prescriptions' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/50' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`}>
                  💊 Prescribe
                </Link>
                <Link to="/prescription-management" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${location.pathname === '/prescription-management' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/50' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                  📋 Rx Mgmt
                </Link>
                <Link to="/case-reports" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${location.pathname === '/case-reports' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/50' : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'}`}>
                  📄 Reports
                </Link>
                <Link to="/export-data" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${location.pathname === '/export-data' ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/50' : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'}`}>
                  📦 Export
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                    <div className="status-online"></div>
                    <span className="text-xs font-medium text-green-700">Online</span>
                </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
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
      <Router>
        <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<PatientList />} />
              <Route path="/register-patient" element={<PatientRegistrationPage />} />
              <Route path="/vitals" element={<VitalsPage />} />
              <Route path="/prescriptions" element={<PrescriptionsPage />} />
              <Route path="/prescription-management" element={<PrescriptionManagementPage />} />
              <Route path="/case-reports" element={<CaseReportsPage />} />
              <Route path="/export-data" element={<ExportDataPage />} />
            </Routes>
        </Layout>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
