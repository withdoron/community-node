import React from 'react';
import { Link } from 'react-router-dom';
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
import { Store, User, LogOut, LayoutDashboard, Plus, Menu, Shield, Calendar, X, Building2 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export default function Layout({ children, currentPageName }) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const isHomePage = currentPageName === 'Home';

  const handleLogout = () => {
    base44.auth.logout();
  };

  const NavContent = () => (
    <>
      <Link to={createPageUrl('Events')}>
        <Button variant="ghost" className="text-slate-300 hover:text-amber-500">
          Browse Events
        </Button>
      </Link>
      <Link to={createPageUrl('Directory')}>
        <Button variant="ghost" className="text-slate-300 hover:text-amber-500">
          Browse Directory
        </Button>
      </Link>
      <Link to={createPageUrl('BusinessDashboard')}>
        <Button variant="ghost" className="text-slate-300 hover:text-amber-500">
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
      </Link>
      {!currentUser?.is_business_owner && (
        <Link to={createPageUrl('BusinessOnboarding')}>
          <Button variant="ghost" className="text-slate-300 hover:text-amber-500">
            <Plus className="h-4 w-4 mr-2" />
            Start Hosting
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header - only show if not on home page (home has its own hero) */}
      {!isHomePage && (
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to={createPageUrl('Home')} className="group flex items-center gap-2 py-2 -ml-2 pl-2 pr-4 cursor-pointer transition-all">
              <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-amber-500/50 group-hover:bg-slate-800 transition-colors">
                <Store className="h-4 w-4 text-white group-hover:text-amber-400 transition-colors" />
              </div>
              <span className="font-bold text-slate-900 text-lg group-hover:text-amber-500 transition-colors">Local Lane</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2">
              <NavContent />
              
              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="ml-2">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{currentUser.full_name}</p>
                      <p className="text-xs text-slate-500">{currentUser.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {currentUser.is_business_owner && (
                                                <DropdownMenuItem asChild>
                                                  <Link to={createPageUrl('BusinessDashboard')}>
                                                    <LayoutDashboard className="h-4 w-4 mr-2" />
                                                    Business Dashboard
                                                  </Link>
                                                </DropdownMenuItem>
                                              )}
                                              {currentUser.role === 'admin' && (
                                                <DropdownMenuItem asChild>
                                                  <Link to={createPageUrl('Admin')}>
                                                    <Shield className="h-4 w-4 mr-2" />
                                                    Admin Panel
                                                  </Link>
                                                </DropdownMenuItem>
                                              )}
                                              <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  className="ml-2 bg-slate-900 hover:bg-slate-800"
                  onClick={() => base44.auth.redirectToLogin()}
                >
                  Sign In
                </Button>
              )}
            </nav>

            {/* Mobile Nav */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden p-4 -mr-4 text-slate-400 hover:text-amber-400 transition-colors z-50 cursor-pointer">
                  <Menu className="w-8 h-8" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-slate-950 border-l border-slate-800 [&>button]:hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 -m-6 mb-6">
                  <div className="font-bold text-lg text-slate-100 tracking-tight">
                    Menu
                  </div>
                  <SheetClose asChild>
                    <button 
                      className="p-2 text-slate-400 hover:text-amber-400 transition-colors rounded-full hover:bg-slate-900"
                      aria-label="Close menu"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18"/>
                        <path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  </SheetClose>
                </div>
                <div className="flex flex-col h-full">
                  <div className="flex flex-col gap-2 flex-1">
                    <SheetClose asChild>
                      <Link to={createPageUrl('Events')}>
                        <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                          <Calendar className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                          Browse Events
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to={createPageUrl('Directory')}>
                        <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                          <Building2 className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                          Browse Directory
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to={createPageUrl('BusinessDashboard')}>
                        <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                          <LayoutDashboard className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                          Dashboard
                        </Button>
                      </Link>
                    </SheetClose>
                    {currentUser?.is_business_owner ? (
                      <SheetClose asChild>
                        <Link to={createPageUrl('BusinessDashboard')}>
                          <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                            <Store className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                            Host Dashboard
                          </Button>
                        </Link>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild>
                        <Link to={createPageUrl('BusinessOnboarding')}>
                          <Button variant="ghost" className="w-full justify-start items-center text-amber-400 hover:text-amber-300 hover:bg-slate-900 group">
                            <Plus className="h-5 w-5 mr-3 text-amber-500 group-hover:text-amber-400" strokeWidth={2} />
                            Start Hosting
                          </Button>
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                  
                  {currentUser ? (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mt-auto">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{currentUser.full_name}</p>
                        <p className="text-xs text-slate-500">{currentUser.email}</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <LogOut className="h-4 w-4" strokeWidth={2} />
                          Log Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <Button 
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                        onClick={() => base44.auth.redirectToLogin()}
                      >
                        Sign In
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
      )}

      {/* Home page header - now consistent with other pages */}
      {isHomePage && (
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to={createPageUrl('Home')} className="group flex items-center gap-2 py-2 -ml-2 pl-2 pr-4 cursor-pointer transition-all">
              <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-amber-500/50 group-hover:bg-slate-800 transition-colors">
                <Store className="h-4 w-4 text-white group-hover:text-amber-400 transition-colors" />
              </div>
              <span className="font-bold text-slate-900 text-lg group-hover:text-amber-500 transition-colors">Local Lane</span>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link to={createPageUrl('Search')}>
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  Browse
                </Button>
              </Link>
              {currentUser?.is_business_owner ? (
                <Link to={createPageUrl('BusinessDashboard')}>
                  <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to={createPageUrl('BusinessOnboarding')}>
                  <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                    <Plus className="h-4 w-4 mr-2" />
                    List Your Business
                  </Button>
                </Link>
              )}
              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="ml-2">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{currentUser.full_name}</p>
                      <p className="text-xs text-slate-500">{currentUser.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {currentUser.is_business_owner && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('BusinessDashboard')}>
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Business Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {currentUser.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Admin')}>
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  className="ml-2 bg-slate-900 hover:bg-slate-800"
                  onClick={() => base44.auth.redirectToLogin()}
                >
                  Sign In
                </Button>
              )}
            </nav>

            {/* Mobile */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden p-4 -mr-4 text-slate-400 hover:text-amber-400 transition-colors z-50 cursor-pointer">
                  <Menu className="w-8 h-8" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-slate-950 border-l border-slate-800 [&>button]:hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 -m-6 mb-6">
                  <div className="font-bold text-lg text-slate-100 tracking-tight">
                    Menu
                  </div>
                  <SheetClose asChild>
                    <button 
                      className="p-2 text-slate-400 hover:text-amber-400 transition-colors rounded-full hover:bg-slate-900"
                      aria-label="Close menu"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18"/>
                        <path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  </SheetClose>
                </div>
                <div className="flex flex-col h-full">
                  <div className="flex flex-col gap-2 flex-1">
                    <SheetClose asChild>
                      <Link to={createPageUrl('Events')}>
                        <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                          <Calendar className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                          Browse Events
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to={createPageUrl('Directory')}>
                        <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                          <Building2 className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                          Browse Directory
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to={createPageUrl('BusinessDashboard')}>
                        <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                          <LayoutDashboard className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                          Dashboard
                        </Button>
                      </Link>
                    </SheetClose>
                    {currentUser?.is_business_owner ? (
                      <SheetClose asChild>
                        <Link to={createPageUrl('BusinessDashboard')}>
                          <Button variant="ghost" className="w-full justify-start items-center text-slate-300 hover:text-amber-500 hover:bg-slate-900 group">
                            <Store className="h-5 w-5 mr-3 text-slate-400 group-hover:text-amber-500" strokeWidth={2} />
                            Host Dashboard
                          </Button>
                        </Link>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild>
                        <Link to={createPageUrl('BusinessOnboarding')}>
                          <Button variant="ghost" className="w-full justify-start items-center text-amber-400 hover:text-amber-300 hover:bg-slate-900 group">
                            <Plus className="h-5 w-5 mr-3 text-amber-500 group-hover:text-amber-400" strokeWidth={2} />
                            Start Hosting
                          </Button>
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                  
                  {currentUser ? (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mt-auto">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{currentUser.full_name}</p>
                        <p className="text-xs text-slate-500">{currentUser.email}</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <LogOut className="h-4 w-4" strokeWidth={2} />
                          Log Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <Button 
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                        onClick={() => base44.auth.redirectToLogin()}
                      >
                        Sign In
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
      )}

      {/* Page Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 cursor-default">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
                <Store className="h-4 w-4 text-slate-900" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight ml-3">Local Lane</span>
            </div>
            <p className="text-slate-500 text-sm mt-4 font-medium">
              © {new Date().getFullYear()} Local Lane. Ad‑free, community‑focused discovery platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}