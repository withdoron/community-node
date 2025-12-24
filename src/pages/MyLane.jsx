import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Sparkles, Calendar, MapPin, Tag, TrendingUp, Music } from "lucide-react";

const FILTER_PILLS = [
  { id: 'for-you', label: 'For You', icon: Sparkles },
  { id: 'this-weekend', label: 'This Weekend', icon: Calendar },
  { id: 'tonight', label: 'Tonight', icon: Calendar },
  { id: 'near-me', label: 'Near Me', icon: MapPin },
  { id: 'exclusive', label: 'Exclusive Offers', icon: Tag }
];

const MOCK_FEED_ITEMS = [
  {
    id: 1,
    type: 'event',
    title: 'Jazz Night at The Blue Note',
    date: 'Fri, Dec 27 • 8:00 PM',
    location: 'The Blue Note, Downtown',
    image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800',
    context: '🎸 Because you like Jazz',
    contextIcon: Music,
    saved: false
  },
  {
    id: 2,
    type: 'event',
    title: 'Comedy Open Mic Night',
    date: 'Sat, Dec 28 • 7:00 PM',
    location: 'Laugh Factory, South End',
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
    context: '📈 Trending in your area',
    contextIcon: TrendingUp,
    saved: false
  },
  {
    id: 3,
    type: 'perk',
    title: 'Free Appetizer at The Jazz Corner',
    subtitle: 'Show this offer to your server',
    validUntil: 'Valid until Dec 31',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    context: '💎 Member Exclusive',
    contextIcon: Sparkles,
    saved: false
  },
  {
    id: 4,
    type: 'event',
    title: 'Indie Rock Showcase',
    date: 'Sun, Dec 29 • 9:00 PM',
    location: 'The Basement, East Side',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    context: '❤️ Similar to events you saved',
    contextIcon: Heart,
    saved: true
  },
  {
    id: 5,
    type: 'perk',
    title: '10% Off All Drinks This Week',
    subtitle: 'At participating venues',
    validUntil: 'Valid until Jan 1',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800',
    context: '💎 Member Perk',
    contextIcon: Sparkles,
    saved: false
  },
  {
    id: 6,
    type: 'event',
    title: 'Yoga in the Park',
    date: 'Sat, Dec 28 • 9:00 AM',
    location: 'Central Park, West Lawn',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    context: '🏃 New activities for you',
    contextIcon: Sparkles,
    saved: false
  }
];

export default function MyLane() {
  const [activeFilter, setActiveFilter] = useState('for-you');
  const [feedItems, setFeedItems] = useState(MOCK_FEED_ITEMS);

  const toggleSave = (id) => {
    setFeedItems(prev => prev.map(item => 
      item.id === id ? { ...item, saved: !item.saved } : item
    ));
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-amber-500" />
            <h1 className="text-3xl font-bold text-slate-100">Your Local Lane</h1>
          </div>
          <p className="text-slate-400">
            Personalized events, offers, and experiences just for you
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTER_PILLS.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border-2 whitespace-nowrap
                    transition-all duration-200 flex-shrink-0
                    ${isActive 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedItems.map((item) => (
            <Card
              key={item.id}
              className={`
                group relative overflow-hidden bg-slate-900 border-slate-800 
                hover:border-slate-700 transition-all duration-300 cursor-pointer
                ${item.type === 'perk' ? 'border-2 border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-900/10' : ''}
              `}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Context Badge Overlay */}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-black/80 text-white border-0 backdrop-blur-sm text-xs">
                    {item.context}
                  </Badge>
                </div>
                {/* Save Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(item.id);
                  }}
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur-sm
                    flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <Heart 
                    className={`h-4 w-4 ${item.saved ? 'fill-red-500 text-red-500' : 'text-white'}`}
                  />
                </button>
                {/* Perk Badge */}
                {item.type === 'perk' && (
                  <div className="absolute bottom-3 left-3">
                    <Badge className="bg-amber-500 text-black border-0 font-bold text-xs">
                      💎 EXCLUSIVE PERK
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-100 mb-2 line-clamp-2 group-hover:text-amber-500 transition-colors">
                  {item.title}
                </h3>
                
                {item.type === 'event' && (
                  <>
                    <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      {item.date}
                    </p>
                    <p className="text-sm text-slate-400 mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-500" />
                      {item.location}
                    </p>
                  </>
                )}

                {item.type === 'perk' && (
                  <>
                    <p className="text-sm text-slate-300 mb-2">{item.subtitle}</p>
                    <p className="text-xs text-amber-500 font-medium mb-4">{item.validUntil}</p>
                  </>
                )}

                {/* Action Button */}
                <Button
                  className={`
                    w-full font-semibold transition-all duration-200
                    ${item.type === 'perk' 
                      ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'}
                  `}
                >
                  {item.type === 'perk' ? 'Claim Offer' : 'More Info'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-12 text-center">
          <Button
            variant="outline"
            className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-amber-500 hover:text-amber-500"
          >
            Load More
          </Button>
        </div>
      </div>
    </div>
  );
}