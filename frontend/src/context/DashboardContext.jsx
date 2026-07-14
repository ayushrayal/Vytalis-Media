import React, { createContext, useContext, useState, useCallback } from 'react';

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState('off');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [datePreset, setDatePreset] = useState('last_7_days');
  const [customRange, setCustomRange] = useState({ since: '', until: '' });

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const resetDashboardState = useCallback(() => {
    setGlobalSearch('');
    setAutoRefresh('off');
    setDatePreset('last_7_days');
    setCustomRange({ since: '', until: '' });
  }, []);

  return (
    <DashboardContext.Provider value={{
      globalSearch,
      setGlobalSearch,
      autoRefresh,
      setAutoRefresh,
      refreshTrigger,
      refreshData,
      datePreset,
      setDatePreset,
      customRange,
      setCustomRange,
      resetDashboardState
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
export default DashboardContext;
