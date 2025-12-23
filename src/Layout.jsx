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
import { Store, User, LogOut, LayoutDashboard, Plus, Menu, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
      <Link to={createPageUrl('Home')}>
        <Button variant="ghost" className="text-slate-300 hover:text-amber-500">
          Personal Dashboard
        </Button>
      </Link>
      {currentUser?.is_business_owner ? (
        <Link to={createPageUrl('BusinessDashboard')}>
          <Button variant="ghost" className="text-slate-300 hover:text-amber-500">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Host Dashboard
          </Button>
        </Link>
      ) : (
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
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 cursor-pointer select-none">
              <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-lg">Local Lane</span>
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
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-8">
                  <Link to={createPageUrl('Search')}>
                    <Button variant="ghost" className="w-full justify-start">
                      Browse Businesses
                    </Button>
                  </Link>
                  {currentUser?.is_business_owner ? (
                    <Link to={createPageUrl('BusinessDashboard')}>
                      <Button variant="ghost" className="w-full justify-start">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Business Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to={createPageUrl('BusinessOnboarding')}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        List Your Business
                      </Button>
                    </Link>
                  )}
                  {currentUser ? (
                    <>
                      <div className="px-4 py-2 border-t">
                        <p className="text-sm font-medium">{currentUser.full_name}</p>
                        <p className="text-xs text-slate-500">{currentUser.email}</p>
                      </div>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="w-full bg-slate-900 hover:bg-slate-800"
                      onClick={() => base44.auth.redirectToLogin()}
                    >
                      Sign In
                    </Button>
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
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 cursor-pointer select-none">
              <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-lg">Local Lane</span>
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
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-8">
                  <Link to={createPageUrl('Search')}>
                    <Button variant="ghost" className="w-full justify-start">
                      Browse Businesses
                    </Button>
                  </Link>
                  {currentUser?.is_business_owner ? (
                    <Link to={createPageUrl('BusinessDashboard')}>
                      <Button variant="ghost" className="w-full justify-start">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Business Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to={createPageUrl('BusinessOnboarding')}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        List Your Business
                      </Button>
                    </Link>
                  )}
                  {currentUser ? (
                    <>
                      <div className="px-4 py-2 border-t">
                        <p className="text-sm font-medium">{currentUser.full_name}</p>
                        <p className="text-xs text-slate-500">{currentUser.email}</p>
                      </div>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="w-full bg-slate-900 hover:bg-slate-800"
                      onClick={() => base44.auth.redirectToLogin()}
                    >
                      Sign In
                    </Button>
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
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
                <Store className="h-4 w-4 text-slate-900" />
              </div>
              <span className="font-bold text-lg">Local Lane</span>
            </div>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Local Lane. Ad‑free, community‑focused discovery platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}