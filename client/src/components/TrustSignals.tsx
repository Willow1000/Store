import { LockKeyhole, RotateCcw, ShieldCheck, Truck } from 'lucide-react';

const signals = [
  { icon: ShieldCheck, label: 'European Auto Parts Specialist' },
  { icon: LockKeyhole, label: 'SSL Protected Checkout' },
  { icon: Truck, label: 'Tracked Delivery Support' },
  { icon: RotateCcw, label: '30-Day Returns Guidance' },
];

export function TrustSignals({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {signals.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className={`flex items-center gap-2 rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm ${
            compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
          }`}
        >
          <Icon className="h-4 w-4 flex-none text-blue-700" aria-hidden="true" />
          <span className="font-medium leading-snug">{label}</span>
        </div>
      ))}
    </div>
  );
}

