import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Store, 
  Calendar, 
  Search, 
  Menu, 
  User, 
  LogOut, 
  LayoutDashboard,
  ChevronRight,
  Sparkles,
  MapPin
} from "lucide-react";

export default function HomeV2() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Search?q=${encodeURIComponent(searchQuery)}`));
    }
  };

  // Mock "Happening Now" data - replace with real queries later
  const happeningNow = [
    {
      id: 1,
      title: "Quest: Dragon on the Butte",
      tag: "Recess",
      tagColor: "bg-emerald-500",
      icon: Calendar
    },
    {
      id: 2,
      title: "New Vendor: Smith Family Farm",
      tag: "Directory",
      tagColor: "bg-amber-500",
      icon: Store
    },
    {
      id: 3,
      title: "Town Hall: Tuesday 6pm",
      tag: "TCA",
      tagColor: "bg-blue-500",
      icon: Calendar
    },
    {
      id: 4,
      title: "Silver-Friendly: Local Mechanic",
      tag: "Directory",
      tagColor: "bg-amber-500",
      icon: Store
    }
  ];

  return (
    <div className="min-h-screen bg-[#1a202c] text-[#f7fafc]">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a202c]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[#d69e2e] rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-[#1a202c]" />
            </div>
            <span className="font-bold text-xl text-white">Local Lane</span>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-white/10">
                    <div className="h-9 w-9 rounded-full bg-[#d69e2e] flex items-center justify-center">
                      <User className="h-5 w-5 text-[#1a202c]" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#2d3748] border-white/10">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-white">{currentUser.full_name}</p>
                    <p className="text-xs text-gray-400">{currentUser.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {currentUser.is_business_owner && (
                    <DropdownMenuItem asChild className="text-gray-200 focus:bg-white/10 focus:text-white">
                      <button onClick={() => navigate(createPageUrl('BusinessDashboard'))} className="w-full">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Business Dashboard
                      </button>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="text-gray-200 focus:bg-white/10 focus:text-white">
                    <button onClick={handleLogout} className="w-full">
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-[#d69e2e] hover:bg-[#b7791f] text-[#1a202c] font-semibold"
              >
                Sign In
              </Button>
            )}
            <Button variant="ghost" size="icon" className="hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Add top padding for fixed header */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            Live Local. Live Free.
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Your hub for trusted trade and family adventures.
          </p>
        </section>

        {/* Primary Navigation - The Fork */}
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1: Local Directory */}
            <Card 
              className="group relative overflow-hidden bg-gradient-to-br from-[#2d3748] to-[#1a202c] border-2 border-[#d69e2e]/30 hover:border-[#d69e2e] transition-all duration-300 cursor-pointer p-8"
              onClick={() => navigate(createPageUrl('Search'))}
            >
              <div className="relative z-10">
                <div className="h-16 w-16 bg-[#d69e2e] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Store className="h-8 w-8 text-[#1a202c]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Local Directory</h2>
                <p className="text-gray-300 text-lg mb-6">
                  Find trusted pros, farms & silver-friendly shops.
                </p>
                <div className="flex items-center text-[#d69e2e] font-semibold group-hover:gap-3 gap-2 transition-all">
                  Explore Directory
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#d69e2e]/0 to-[#d69e2e]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Card>

            {/* Card 2: Local Events */}
            <Card 
              className="group relative overflow-hidden bg-gradient-to-br from-[#2d3748] to-[#1a202c] border-2 border-[#d69e2e]/30 hover:border-[#d69e2e] transition-all duration-300 cursor-pointer p-8"
              onClick={() => navigate(createPageUrl('Home'))}
            >
              <div className="relative z-10">
                <div className="h-16 w-16 bg-[#d69e2e] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Calendar className="h-8 w-8 text-[#1a202c]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Local Events</h2>
                <p className="text-gray-300 text-lg mb-6">
                  Recess quests, TCA projects & town halls.
                </p>
                <div className="flex items-center text-[#d69e2e] font-semibold group-hover:gap-3 gap-2 transition-all">
                  Explore Events
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#d69e2e]/0 to-[#d69e2e]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Card>
          </div>
        </section>

        {/* Global Search */}
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search... (e.g., Plumber, Recess, Eggs)"
              className="w-full pl-12 pr-4 py-4 bg-[#2d3748] border-2 border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#d69e2e] transition-colors text-lg"
            />
          </form>
        </section>

        {/* Happening Now */}
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-[#d69e2e]" />
            <h2 className="text-2xl font-bold text-white">Happening Now</h2>
          </div>
          
          {/* Horizontal Scrolling Carousel */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {happeningNow.map((item) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={item.id}
                  className="flex-shrink-0 w-80 bg-gradient-to-br from-[#2d3748] to-[#1a202c] border border-white/10 hover:border-[#d69e2e]/50 transition-all cursor-pointer p-6 snap-start"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-[#d69e2e]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-[#d69e2e]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge className={`${item.tagColor} text-white text-xs mb-2`}>
                        {item.tag}
                      </Badge>
                      <h3 className="text-white font-semibold text-lg truncate">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="bg-[#2d3748] border-t border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Own a local business?
            </h2>
            <p className="text-gray-300 mb-6 max-w-xl mx-auto">
              Join Local Lane and connect with your community.
            </p>
            <Button 
              size="lg"
              className="bg-[#d69e2e] hover:bg-[#b7791f] text-[#1a202c] font-semibold px-8"
              onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
            >
              List Your Business
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </section>
      </main>

      {/* Custom scrollbar hide for carousel */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}