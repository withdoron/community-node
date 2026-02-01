import React from 'react';
import BusinessCard from '@/components/business/BusinessCard';

/**
 * SearchResultsSection
 * Renders search results in a simple grid. Trust-based ranking only (no featured/boost bands).
 */
export default function SearchResultsSection({ results = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {results.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  );
}
