import React from 'react';
import BusinessCard from '@/components/business/BusinessCard';

/**
 * SearchResultsSection
 * Renders search results in a simple grid. Trust-based ranking only (no featured/boost bands).
 */
export default function SearchResultsSection({ results = [] }) {
  return (
    <div className="grid gap-4">
      {results.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  );
}
