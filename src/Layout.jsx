import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Store, User, LogOut, LayoutDashboard, Shield, Calendar, Menu, Sparkles, Ticket, Settings } from "lucide-react";
import Footer from '@/components/layout/Footer';

export default function Layout({ children, currentPageName: currentPageNameProp }) {
  const location = useLocation();
  const currentPageName = currentPageNameProp ?? location.pathname?.replace(/^\//, '').split('?')[0]?.split('/')[0] ?? '';

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const { data: staffBusinesses = [] } = useQuery({
    queryKey: ['staff-businesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const allBusinesses = await base44.entities.Business.filter({ is_active: true });
      return allBusinesses.filter(b => b.instructors?.includes(currentUser.id));
    },
    enabled: !!currentUser?.id && !currentUser?.is_business_owner
  });

  const userHasStaffRole = currentUser?.is_business_owner || staffBusinesses.length > 0;

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navLinkClass = (page) =>
    currentPageName === page ? 'px-3 py-2 text-amber-500' : 'px-3 py-2 text-slate-300 hover:text-amber-500';

  const sheetLinkClass = (page) =>
    currentPageName === page
      ? 'py-3 px-4 rounded-lg bg-amber-500/10 text-amber-500'
      : 'py-3 px-4 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-slate-800';

  const getUserInitials = () => {
    if (!currentUser?.full_name) return null;
    const parts = currentUser.full_name.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userInitials = getUserInitials();

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <Link
            to={createPageUrl('Home')}
            className="group flex items-center gap-2 py-2 -ml-2 pl-2 pr-4 cursor-pointer transition-all rounded-lg"
          >
            <div className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
              <Store className="h-4 w-4 text-white group-hover:text-amber-400 transition-colors" />
            </div>
            <span className="font-bold text-slate-100 text-lg group-hover:text-amber-500 transition-colors">
              Local Lane
            </span>
          </Link>

          {/* Center-right: Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 ml-auto">
            <Link to={createPageUrl('Directory')} className={navLinkClass('Directory')}>
              Directory
            </Link>
            <Link to={createPageUrl('Events')} className={navLinkClass('Events')}>
              Events
            </Link>
            {currentUser && userHasStaffRole && (
              <Link to={createPageUrl('BusinessDashboard')} className={navLinkClass('BusinessDashboard')}>
                Dashboard
              </Link>
            )}

            {/* Separator */}
            <div className="w-px h-5 bg-slate-700 mx-3" />

            {/* Far right: User area */}
            {!currentUser ? (
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Sign In
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 rounded-full bg-amber-500/10 border-2 border-amber-500/30 hover:border-amber-500/60 flex items-center justify-center transition-colors cursor-pointer">
                    {userInitials ? (
                      <span className="text-xs font-bold text-amber-500">{userInitials}</span>
                    ) : (
                      <User className="h-4 w-4 text-amber-500" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 bg-slate-900 border border-slate-700 shadow-xl shadow-black/20 [&>*]:bg-transparent">
                  <div className="px-2 py-2">
                    <p className="text-sm font-medium text-slate-100">{currentUser.full_name}</p>
                    <p className="text-xs text-slate-500">{currentUser.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem asChild className="text-slate-300 hover:text-amber-500 !bg-transparent hover:!bg-slate-800 focus:text-amber-500 focus:!bg-slate-800 cursor-pointer">
                    <Link to={createPageUrl('MyLane')} className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      My Lane
                    </Link>
                  </DropdownMenuItem>
                  {(currentUser.is_business_owner || userHasStaffRole) && (
                    <DropdownMenuItem asChild className="text-slate-300 hover:text-amber-500 !bg-transparent hover:!bg-slate-800 focus:text-amber-500 focus:!bg-slate-800 cursor-pointer">
                      <Link to={createPageUrl('BusinessDashboard')} className="flex items-center">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Business Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {currentUser.role === 'admin' && (
                    <DropdownMenuItem asChild className="text-slate-300 hover:text-amber-500 !bg-transparent hover:!bg-slate-800 focus:text-amber-500 focus:!bg-slate-800 cursor-pointer">
                      <Link to={createPageUrl('Admin')} className="flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="text-slate-300 hover:text-amber-500 !bg-transparent hover:!bg-slate-800 focus:text-amber-500 focus:!bg-slate-800 cursor-pointer">
                    <Link to={createPageUrl('PunchPass')} className="flex items-center">
                      <Ticket className="h-4 w-4 mr-2" />
                      Punch Pass
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-slate-300 hover:text-amber-500 !bg-transparent hover:!bg-slate-800 focus:text-amber-500 focus:!bg-slate-800 cursor-pointer">
                    <Link to={createPageUrl('Settings')} className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300 !bg-transparent hover:!bg-slate-800 focus:text-red-300 focus:!bg-slate-800 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Mobile: Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {!currentUser ? (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Sign In
              </Button>
            ) : null}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-slate-900 border-l border-slate-800 p-0 flex flex-col w-full max-w-[280px]">
                <div className="flex flex-col flex-1 overflow-y-auto">
                  <div className="p-4 border-b border-slate-800">
                    <SheetClose asChild>
                      <Link to={createPageUrl('Home')} className="group flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center group-hover:border-amber-500/50">
                          <Store className="h-4 w-4 text-white group-hover:text-amber-400" />
                        </div>
                        <span className="font-bold text-slate-100 text-lg group-hover:text-amber-500">Local Lane</span>
                      </Link>
                    </SheetClose>
                  </div>
                  <div className="py-4 flex flex-col">
                    <SheetClose asChild>
                      <Link to={createPageUrl('Directory')} className={`flex items-center gap-3 ${sheetLinkClass('Directory')}`}>
                        <Store className="h-5 w-5 flex-shrink-0" />
                        Directory
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to={createPageUrl('Events')} className={`flex items-center gap-3 ${sheetLinkClass('Events')}`}>
                        <Calendar className="h-5 w-5 flex-shrink-0" />
                        Events
                      </Link>
                    </SheetClose>
                    {currentUser && userHasStaffRole && (
                      <SheetClose asChild>
                        <Link to={createPageUrl('BusinessDashboard')} className={`flex items-center gap-3 ${sheetLinkClass('BusinessDashboard')}`}>
                          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                          Dashboard
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                  <div className="border-t border-slate-800 my-4" />
                  {currentUser && (
                    <div className="flex flex-col gap-1 px-4">
                      <SheetClose asChild>
                        <Link to={createPageUrl('MyLane')} className={`flex items-center gap-3 ${sheetLinkClass('MyLane')}`}>
                          <Sparkles className="h-5 w-5 flex-shrink-0" />
                          My Lane
                        </Link>
                      </SheetClose>
                      {(currentUser.is_business_owner || userHasStaffRole) && (
                        <SheetClose asChild>
                          <Link to={createPageUrl('BusinessDashboard')} className={`flex items-center gap-3 ${sheetLinkClass('BusinessDashboard')}`}>
                            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                            Business Dashboard
                          </Link>
                        </SheetClose>
                      )}
                      {currentUser.role === 'admin' && (
                        <SheetClose asChild>
                          <Link to={createPageUrl('Admin')} className={`flex items-center gap-3 ${sheetLinkClass('Admin')}`}>
                            <Shield className="h-5 w-5 flex-shrink-0" />
                            Admin Panel
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <Link to={createPageUrl('PunchPass')} className={`flex items-center gap-3 ${sheetLinkClass('PunchPass')}`}>
                          <Ticket className="h-5 w-5 flex-shrink-0" />
                          Punch Pass
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to={createPageUrl('Settings')} className={`flex items-center gap-3 ${sheetLinkClass('Settings')}`}>
                          <Settings className="h-5 w-5 flex-shrink-0" />
                          Settings
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
                <div className="mt-auto p-4 border-t border-slate-800">
                  {currentUser ? (
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                      <p className="text-sm font-medium text-slate-100">{currentUser.full_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{currentUser.email}</p>
                      <button
                        onClick={handleLogout}
                        className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                      onClick={() => base44.auth.redirectToLogin()}
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <Footer />
    </div>
  );
}
