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
          placeholder="What are you looking for? (e.g., carpenter, mechanic, farm…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 h-14 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-lg"
        />
      </div>
    </form>
  );
}