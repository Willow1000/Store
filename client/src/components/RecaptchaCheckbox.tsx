'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          theme?: 'light' | 'dark';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => number;
      reset: (widgetId?: number) => void;
      ready: (callback: () => void) => void;
    };
  }
}

interface RecaptchaCheckboxProps {
  onChange?: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  className?: string;
  label?: string;
  helperText?: string;
}

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() || '';
const scriptId = 'google-recaptcha-v2-script';

let scriptLoaded = false;

function loadRecaptchaScript() {
  return new Promise<void>((resolve, reject) => {
    if (scriptLoaded || window.grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.body.appendChild(script);
  });
}

export function RecaptchaCheckbox({
  onChange,
  onExpired,
  onError,
  className = '',
  label = 'Security check',
  helperText = '',
}: RecaptchaCheckboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(siteKey ? null : 'Add VITE_RECAPTCHA_SITE_KEY to show the widget.');

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let isMounted = true;

    loadRecaptchaScript()
      .then(() => {
        if (!isMounted || !containerRef.current) return;

        if (!window.grecaptcha) {
          setLoadError('reCAPTCHA not available');
          return;
        }

        window.grecaptcha.ready(() => {
          if (!isMounted || !containerRef.current || widgetIdRef.current !== null) {
            return;
          }

          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              theme: 'light',
              callback: (token: string) => {
                onChange?.(token);
              },
              'expired-callback': () => {
                onChange?.(null);
                onExpired?.();
              },
              'error-callback': () => {
                onChange?.(null);
                onError?.();
              },
            });
          } catch (error) {
            if (isMounted) {
              setLoadError('Failed to render reCAPTCHA');
            }
          }
        });
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load reCAPTCHA');
        }
      });

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch {
          // Ignore errors
        }
      }
    };
  }, [onChange, onExpired, onError]);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-2 text-xs sm:text-sm font-medium text-gray-700">
          {label}
        </div>
      )}
      {helperText && (
        <p className="mb-3 text-xs sm:text-sm text-gray-500">{helperText}</p>
      )}
      {loadError ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
          {loadError}
        </div>
      ) : (
        <div className="flex justify-center sm:justify-start overflow-x-auto">
          <div 
            ref={containerRef} 
            className="transform-gpu scale-90 sm:scale-100 origin-left sm:origin-top-left"
            style={{
              minHeight: '78px',
            }}
          />
        </div>
      )}
    </div>
  );
}