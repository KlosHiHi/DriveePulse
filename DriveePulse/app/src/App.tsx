import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import Layout from '@/components/Layout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ClientPage from '@/pages/ClientPage';
import DriverPage from '@/pages/DriverPage';
import './index.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/client" replace />} />
            <Route path="/client" element={<ClientPage />} />
            <Route path="/driver" element={<DriverPage />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
