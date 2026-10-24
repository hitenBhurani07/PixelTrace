import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CaseProvider } from './context/CaseContext';
import { MainLayout } from './layouts/MainLayout';

import { Dashboard } from './pages/Dashboard';
import { Cases } from './pages/Cases';
import { EvidenceCollection } from './pages/EvidenceCollection';
import { EvidenceDetail } from './pages/EvidenceDetail';
import { SimilaritySearch } from './pages/SimilaritySearch';
import { ProvenanceGraph } from './pages/ProvenanceGraph';
import { MetadataCorrelation } from './pages/MetadataCorrelation';
import { TransformationAnalysis } from './pages/TransformationAnalysis';
import { InvestigationTimeline } from './pages/InvestigationTimeline';
import { Reports } from './pages/Reports';
import { SettingsAbout } from './pages/SettingsAbout';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <CaseProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cases" element={<Cases />} />
            <Route path="evidence" element={<EvidenceCollection />} />
            <Route path="evidence/:evidenceId" element={<EvidenceDetail />} />
            <Route path="similarity" element={<SimilaritySearch />} />
            <Route path="graph" element={<ProvenanceGraph />} />
            <Route path="metadata" element={<MetadataCorrelation />} />
            <Route path="transformation" element={<TransformationAnalysis />} />
            <Route path="timeline" element={<InvestigationTimeline />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsAbout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CaseProvider>
    </BrowserRouter>
  );
};

export default App;
