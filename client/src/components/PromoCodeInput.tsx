'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface PromoCodeInputProps {
  subtotal: number;
  onDiscountApply?: (discountAmount: number, discountLabel: string) => void;
  disabled?: boolean;
}

/**
 * PromoCodeInput: Component for entering and validating promo codes at checkout.
 * 
 * - Accepts alphanumeric promo codes with case-insensitive matching
 * - Validates offers against subtotal and usage limits (server-side)
 * - Shows real-time discount amount when valid
 * - Displays user-friendly error messages
 * - Integrates with the existing offer system
 */
export function PromoCodeInput({
  subtotal,
  onDiscountApply,
  disabled = false,
}: PromoCodeInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Query for resolving the promo code
  const resolveOffer = trpc.offers.resolve.useQuery(
    { code: appliedCode || '', subtotal },
    {
      enabled: Boolean(appliedCode) && subtotal > 0,
      retry: false,
    }
  );

  // Notify parent when discount is applied
  useEffect(() => {
    if (resolveOffer.data) {
      onDiscountApply?.(resolveOffer.data.discountAmount, resolveOffer.data.name);
    }
  }, [resolveOffer.data, onDiscountApply]);

  const handleApplyCode = async () => {
    const trimmedCode = inputValue.trim().toUpperCase();

    if (!trimmedCode) {
      toast.error('Please enter a promo code');
      return;
    }

    if (!/^[A-Z0-9_-]{3,32}$/.test(trimmedCode)) {
      toast.error('Invalid promo code format');
      return;
    }

    setIsSubmitting(true);
    try {
      // Set the code to trigger the query
      setAppliedCode(trimmedCode);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCode = () => {
    setInputValue('');
    setAppliedCode(null);
    onDiscountApply?.(0, '');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const isLoading = isSubmitting || (appliedCode && resolveOffer.isLoading);
  const isValid = appliedCode && resolveOffer.data;
  const isError = appliedCode && resolveOffer.isError;

  return (
    <div className="space-y-4">
      {/* Input Area */}
      {!isValid && (
        <div className="flex gap-2 sm:gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isLoading && !disabled) {
                handleApplyCode();
              }
            }}
            placeholder="Enter promo code"
            disabled={isLoading || disabled}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            maxLength={32}
            aria-label="Promo code input"
          />
          <button
            onClick={handleApplyCode}
            disabled={isLoading || disabled || !inputValue.trim()}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-black text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base flex items-center gap-2"
            title="Apply promo code"
          >
            <Send size={16} className="hidden sm:inline" />
            <span>Apply</span>
          </button>
        </div>
      )}

      {/* Success State */}
      {isValid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-green-900">
                {resolveOffer.data?.name || 'Promo Code Applied'}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Discount: {currencySymbol}
                {resolveOffer.data?.discountAmount.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveCode}
            className="text-green-600 hover:text-green-800 font-medium text-sm flex-shrink-0"
          >
            Remove
          </button>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-900">
              Code not valid
            </p>
            <p className="text-xs text-red-700 mt-1">
              This code may be expired, inactive, or have reached its usage limit.
            </p>
          </div>
        </div>
      )}

      {/* Hint */}
      {!isValid && !isError && (
        <p className="text-xs text-gray-500 px-1">
          Have a promo code? Enter it above to get a discount on your order.
        </p>
      )}
    </div>
  );
}

// Helper to get currency symbol
const currencySymbol = '$'; // Could be enhanced to accept currency as prop
