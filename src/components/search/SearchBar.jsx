import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

export default function SearchBar({ onSearch, initialQuery = '', initialLocation = '' }) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ query, location: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search businesses, events..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 h-14 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500 text-base sm:text-lg rounded-xl"
        />
      </div>
    </form>
  );
}