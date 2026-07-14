import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Adsets from './pages/Adsets';
import CreativeGallery from './pages/CreativeGallery';
import Winners from './pages/Winners';
import PoorPerformers from './pages/PoorPerformers';
import VideoAnalysis from './pages/VideoAnalysis';
import StaticAnalysis from './pages/StaticAnalysis';
import AudienceReports from './pages/AudienceReports';
import PlacementReports from './pages/PlacementReports';
import AgeBreakdown from './pages/AgeBreakdown';
import AIInsights from './pages/AIInsights';
import CreativeDetails from './pages/CreativeDetails';
import Profile from './pages/Profile';
import Signup from './pages/Signup';
import DebugPanel from './components/DebugPanel';

// Wrapper component to inject DashboardContext state into DashboardLayout
const LayoutWrapper = ({ children }) => {
  const {
    globalSearch,
    setGlobalSearch,
    refreshData,
    autoRefresh,
    setAutoRefresh
  } = useDashboard();

  return (
    <DashboardLayout
      globalSearch={globalSearch}
      setGlobalSearch={setGlobalSearch}
      refreshData={refreshData}
      autoRefresh={autoRefresh}
      setAutoRefresh={setAutoRefresh}
    >
      {children}
    </DashboardLayout>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DashboardProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Dashboard Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <Dashboard />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/campaigns" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <Campaigns />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/adsets" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <Adsets />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/creatives" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <CreativeGallery />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/creatives/:id" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <CreativeDetails />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/winners" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <Winners />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/poor-performers" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <PoorPerformers />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/video-analysis" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <VideoAnalysis />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/static-analysis" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <StaticAnalysis />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/audience" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <AudienceReports />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/placements" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <PlacementReports />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/age-breakdown" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <AgeBreakdown />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/ai-insights" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <AIInsights />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />

              <Route path="/profile" element={
                <ProtectedRoute>
                  <LayoutWrapper>
                    <Profile />
                  </LayoutWrapper>
                </ProtectedRoute>
              } />
            </Routes>
            {import.meta.env.DEV && <DebugPanel />}
          </Router>
        </DashboardProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
