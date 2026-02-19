/**
 * Admin layout wrapper: sidebar on left (w-64), content area fills remaining space.
 * Mobile: sidebar in Sheet with hamburger. Per ADMIN-ARCHITECTURE.md and STYLE-GUIDE.md.
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-slate-700 bg-slate-900 shrink-0">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-slate-900 border-slate-700">
              <AdminSidebar onItemClick={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold text-slate-100">Admin Panel</h1>
        </div>

        <main className="flex-1 overflow-auto bg-slate-800">
          {children != null ? children : <Outlet />}
        </main>
      </div>
    </div>
  );
}
