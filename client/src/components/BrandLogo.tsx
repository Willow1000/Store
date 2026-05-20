import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  variant?: 'light' | 'dark';
};

export function BrandLogo({ className, variant = 'light' }: BrandLogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden',
        variant === 'dark' && 'rounded-xl bg-white p-1.5 shadow-sm',
        className,
      )}
    >
      <>
        <img
          src="/images/motorvault_horizontal.svg"
          alt="MotorVault"
          className="h-full w-auto select-none"
          draggable={false}
          onError={(e) => {
            try {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.brandlogo-fallback') as HTMLElement | null;
                if (fallback) fallback.style.display = 'block';
              }
            } catch (err) {
              // ignore
            }
          }}
        />

        <div className="brandlogo-fallback" style={{ display: 'none' }} aria-hidden>
          <svg viewBox="0 0 800 160" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
            <g transform="translate(30, 25)">
              <circle cx="60" cy="60" r="58" fill="none" stroke="#0f1724" strokeWidth="2.5" />
              <g>
                <path d="M 38 50 Q 38 28 60 28 Q 82 28 82 50" fill="none" stroke="#0f1724" strokeWidth="4" strokeLinecap="round" />
                <rect x="40" y="50" width="40" height="45" rx="3" fill="#0f1724" />
                <rect x="42" y="52" width="36" height="41" rx="2" fill="#f5f5f5" />
                <circle cx="60" cy="70" r="5" fill="#0f1724" />
                <rect x="58" y="75" width="4" height="12" fill="#0f1724" rx="1" />
              </g>
              <circle cx="60" cy="95" r="2.5" fill="#dc2626" />
            </g>
            <text x="125" y="110" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="56" fontWeight="700" letterSpacing="-0.5px" fill="#0f1724">MOTOR</text>
            <text x="525" y="110" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="56" fontWeight="300" letterSpacing="-0.5px" fill="#0f1724">VAULT</text>
          </svg>
        </div>
      </>
    </span>
  );
}

export default BrandLogo;