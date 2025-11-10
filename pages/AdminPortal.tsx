
import React from 'react';
// FIX: Changed import from 'react-router-dom' to 'react-router' to handle potential module resolution issues.
import { Routes, Route, Navigate } from 'react-router';
import Layout from '../components/Layout';
import Dashboard from './Dashboard';
import Campaigns from './Campaigns';
import Settings from './Settings';
import CampaignAnalytics from './CampaignAnalytics';

interface AdminPortalProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <Layout isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:campaignId" element={<Campaigns />} />
        <Route path="campaigns/:campaignId/analytics" element={<CampaignAnalytics />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
};

export default AdminPortal;