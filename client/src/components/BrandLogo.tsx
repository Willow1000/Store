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
      <img
        src="/images/motorvault_horizontal.svg"
        alt="MotorVault"
        className="h-full w-auto select-none"
        draggable={false}
      />
    </span>
  );
}

export default BrandLogo;