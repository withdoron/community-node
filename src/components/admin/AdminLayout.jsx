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
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-card border-border">
              <AdminSidebar onItemClick={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
        </div>

        <main className="flex-1 overflow-auto bg-secondary">
          {children != null ? children : <Outlet />}
        </main>
      </div>
    </div>
  );
}
