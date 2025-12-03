import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

export default function SearchBar({ onSearch, initialQuery = '', initialLocation = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ query, location });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="What are you looking for?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
          />
        </div>
        <div className="relative sm:w-64">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="City or ZIP"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10 h-12 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
          />
        </div>
        <Button 
          type="submit" 
          className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-medium"
        >
          Search
        </Button>
      </div>
    </form>
  );
}