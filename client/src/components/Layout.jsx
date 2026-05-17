import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Header from './Header';
import Sidebar from './Sidebar';

export const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="main-content animate-fade-in bg-bg-primary">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
