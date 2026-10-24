import React, { createContext, useContext, useState, useEffect } from 'react';
import { InvestigationCase } from '../types';
import { forensicApi } from '../services/api';

interface CaseContextType {
  activeCase: InvestigationCase | null;
  cases: InvestigationCase[];
  loadingCases: boolean;
  setActiveCaseId: (id: number | null) => void;
  refreshCases: () => Promise<void>;
}

const CaseContext = createContext<CaseContextType>({
  activeCase: null,
  cases: [],
  loadingCases: false,
  setActiveCaseId: () => {},
  refreshCases: async () => {},
});

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [activeCaseId, setActiveCaseIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem('pixeltrace_active_case_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [loadingCases, setLoadingCases] = useState(false);

  const refreshCases = async () => {
    setLoadingCases(true);
    try {
      const data = await forensicApi.getCases();
      setCases(data);
      if (activeCaseId && !data.find(c => c.id === activeCaseId)) {
        setActiveCaseIdState(data.length > 0 ? data[0].id : null);
      } else if (!activeCaseId && data.length > 0) {
        setActiveCaseIdState(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    refreshCases();
  }, []);

  const setActiveCaseId = (id: number | null) => {
    setActiveCaseIdState(id);
    if (id !== null) {
      localStorage.setItem('pixeltrace_active_case_id', id.toString());
    } else {
      localStorage.removeItem('pixeltrace_active_case_id');
    }
  };

  const activeCase = cases.find(c => c.id === activeCaseId) || null;

  return (
    <CaseContext.Provider value={{ activeCase, cases, loadingCases, setActiveCaseId, refreshCases }}>
      {children}
    </CaseContext.Provider>
  );
};

export const useCase = () => useContext(CaseContext);
