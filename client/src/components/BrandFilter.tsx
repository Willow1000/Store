"use client";

import { useState, useMemo } from "react";
import { X, ChevronDown } from "lucide-react";
import { Brand } from "@/types/supabase";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreMobile, setShowMoreMobile] = useState(false);

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery) return brands;
    return brands.filter(brand =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brands, searchQuery]);

  // Show selected brands at the top
  const selectedBrandObjects = useMemo(() => {
    return brands.filter(b => selectedBrands.includes(b.name));
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
            onChange={e => {
              setSearchQuery(e.target.value);
              // Auto-open dropdown when user starts typing
              if (e.target.value && !showMoreMobile) {
                setShowMoreMobile(true);
              }
            }}
            className="w-full max-w-sm px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
          <button
            onClick={() => setShowMoreMobile(!showMoreMobile)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-ink transition-colors"
            aria-label={showMoreMobile ? "Hide brands" : "Show brands"}
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform ${showMoreMobile ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Selected brands as pills */}
        {selectedBrands.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedBrandObjects.map(brand => (
              <div
                key={brand.id}
                className="flex items-center gap-2 bg-gray-100 text-ink px-3 py-1 rounded-full text-sm"
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
                  className="text-gray-500 hover:text-ink ml-1"
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
                <p className="text-xs text-red-600 mb-2">
                  Error loading brands: {error}
                </p>
                <p className="text-xs text-gray-500">
                  Please check the browser console for details.
                </p>
              </div>
            ) : displayedBrands.length > 0 ? (
              <>
                {displayedBrands.map(brand => (
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

  // Default view - one compact rail of brand chips (scrolls sideways on
  // mobile, wraps on larger screens) with a small search box.
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* Search box */}
        <input
          type="text"
          placeholder="Search brands..."
          aria-label="Search brands..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          // Phones get the swipeable chip row only; the brand search box and
          // its hint pushed the first products a whole screen down.
          className="field hidden !min-h-10 sm:block sm:w-44 sm:flex-none"
        />

        {/* Brand chips */}
        <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-24 flex-none animate-pulse rounded-full bg-muted"
              />
            ))
          ) : error ? (
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-ink">
                Error loading brands
              </p>
              <p className="mt-1 text-xs text-gray-600">{error}</p>
            </div>
          ) : displayedBrands.length > 0 ? (
            displayedBrands.map(brand => {
              const isSelected = selectedBrands.includes(brand.name);
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => onBrandToggle(brand.name)}
                  aria-pressed={isSelected}
                  className={`inline-flex h-11 flex-none items-center sm:h-10 gap-2 rounded-full border pl-1.5 pr-3.5 text-[13px] font-medium transition-colors ${
                    isSelected
                      ? "border-ink bg-ink text-white"
                      : "border-gray-300 bg-white text-ink hover:border-ink"
                  }`}
                >
                  {/* Logo when the brand has one; otherwise a plain text chip */}
                  {brand.image_url ? (
                    <span className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full bg-white">
                      <img
                        src={brand.image_url}
                        alt=""
                        width={20}
                        height={20}
                        loading="lazy"
                        decoding="async"
                        className="h-5 w-5 object-contain"
                      />
                    </span>
                  ) : (
                    <span className="w-1.5" aria-hidden="true" />
                  )}
                  <span className="whitespace-nowrap">{brand.name}</span>
                </button>
              );
            })
          ) : (
            <p className="py-2.5 text-xs text-gray-500">No brands found</p>
          )}
        </div>
      </div>

      {/* Info about hidden brands when search is inactive */}
      {hasMoreBrands && !searchQuery && (
        <p className="mt-2 hidden text-xs text-gray-500 sm:block">
          Showing {displayedBrands.length} of {filteredBrands.length} brands.
          Use the search to find {filteredBrands.length - 12} more.
        </p>
      )}
    </div>
  );
}
