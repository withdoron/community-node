/**
 * Admin layout wrapper: sidebar on left (w-64), content area fills remaining space.
 * Per ADMIN-ARCHITECTURE.md and STYLE-GUIDE.md.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-slate-800">
        {children != null ? children : <Outlet />}
      </main>
    </div>
  );
}
