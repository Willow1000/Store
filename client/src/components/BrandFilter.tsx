'use client';

import { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Brand } from '@/types/supabase';

interface BrandFilterProps {
  brands: Brand[];
  selectedBrands: string[];
  onBrandToggle: (brandName: string) => void;
  isLoading?: boolean;
  compact?: boolean; // For mobile next to filter icon
  error?: string | null;
}

export function BrandFilter({
  brands,
  selectedBrands,
  onBrandToggle,
  isLoading = false,
  compact = false,
  error,
}: BrandFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMoreMobile, setShowMoreMobile] = useState(false);

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery) return brands;
    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brands, searchQuery]);

  // Show selected brands at the top
  const selectedBrandObjects = useMemo(() => {
    return brands.filter((b) => selectedBrands.includes(b.name));
  }, [brands, selectedBrands]);

  // Limit displayed brands based on view and search
  const displayedBrands = useMemo(() => {
    // For mobile: if search is active, show filtered results; otherwise limit to 6 when dropdown is open
    if (compact) {
      if (!showMoreMobile) {
        return []; // Dropdown closed, show nothing
      }
      if (searchQuery) {
        return filteredBrands; // Search active, show all matches
      }
      return filteredBrands.slice(0, 6); // Dropdown open without search, show max 6
    }
    // For desktop: if search is active, show all filtered; otherwise limit to 12
    if (searchQuery) {
      return filteredBrands;
    }
    return filteredBrands.slice(0, 12);
  }, [filteredBrands, searchQuery, compact, showMoreMobile]);

  const hasMoreBrands = !searchQuery && filteredBrands.length > 12;

  if (compact) {
    // Mobile/tablet compact view - show selected brands as pills with search and dropdown
    return (
      <div className="mt-3">
        {/* Search box with integrated dropdown toggle */}
        <div className="mb-3 relative">
          <input
            type="text"
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Auto-open dropdown when user starts typing
              if (e.target.value && !showMoreMobile) {
                setShowMoreMobile(true);
              }
            }}
            className="w-full max-w-sm px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowMoreMobile(!showMoreMobile)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label={showMoreMobile ? 'Hide brands' : 'Show brands'}
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${showMoreMobile ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Selected brands as pills */}
        {selectedBrands.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedBrandObjects.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                {brand.image_url && (
                  <img
                    src={brand.image_url}
                    alt={brand.name}
                    className="w-4 h-4 object-contain"
                  />
                )}
                <span className="font-medium">{brand.name}</span>
                <button
                  onClick={() => onBrandToggle(brand.name)}
                  className="text-blue-600 hover:text-blue-800 ml-1"
                  aria-label={`Remove ${brand.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Brand dropdown - appears below search when opened */}
        {showMoreMobile && (
          <div className="mb-3 space-y-2 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
            {isLoading ? (
              <p className="text-xs text-gray-500 p-2">Loading brands...</p>
            ) : error ? (
              <div className="p-2">
                <p className="text-xs text-red-600 mb-2">Error loading brands: {error}</p>
                <p className="text-xs text-gray-500">Please check the browser console for details.</p>
              </div>
            ) : displayedBrands.length > 0 ? (
              <>
                {displayedBrands.map((brand) => (
                  <label
                    key={brand.id}
                    className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.name)}
                      onChange={() => onBrandToggle(brand.name)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    {brand.image_url && (
                      <img
                        src={brand.image_url}
                        alt={brand.name}
                        className="w-4 h-4 ml-2 object-contain"
                      />
                    )}
                    <span className="text-sm ml-2">{brand.name}</span>
                  </label>
                ))}
                {!searchQuery && filteredBrands.length > 6 && (
                  <p className="text-xs text-gray-500 p-2 mt-2 border-t border-gray-200">
                    Use search to find {filteredBrands.length - 6} more brands
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500 p-2">No brands found</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop view - show as horizontal logo/name badges above search
  return (
    <div>
      {/* Search box */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search brands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Brand grid - desktop view */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))
        ) : error ? (
          <div className="col-span-full p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium mb-2">Error loading brands</p>
            <p className="text-xs text-red-600 mb-2">{error}</p>
            <p className="text-xs text-gray-600">Please check the browser console for more details.</p>
          </div>
        ) : displayedBrands.length > 0 ? (
          displayedBrands.map((brand) => {
            const isSelected = selectedBrands.includes(brand.name);
            return (
              <button
                key={brand.id}
                onClick={() => onBrandToggle(brand.name)}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {brand.image_url ? (
                  <img
                    src={brand.image_url}
                    alt={brand.name}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                    {brand.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-center line-clamp-2">
                  {brand.name}
                </span>
              </button>
            );
          })
        ) : (
          <p className="col-span-full text-xs text-gray-500 text-center py-4">
            No brands found
          </p>
        )}
      </div>

      {/* Info about hidden brands when search is inactive */}
      {hasMoreBrands && !searchQuery && (
        <p className="mt-3 text-xs text-gray-500">
          Showing {displayedBrands.length} of {filteredBrands.length} brands. Use the search to find {filteredBrands.length - 12} more.
        </p>
      )}

      {/* Selected brands summary */}
      {selectedBrands.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedBrandObjects.map((brand) => (
            <div
              key={brand.id}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
            >
              {brand.image_url && (
                <img
                  src={brand.image_url}
                  alt={brand.name}
                  className="w-4 h-4 object-contain"
                />
              )}
              <span>{brand.name}</span>
              <button
                onClick={() => onBrandToggle(brand.name)}
                className="text-blue-600 hover:text-blue-800 ml-1"
                aria-label={`Remove ${brand.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
