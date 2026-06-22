import { Link, useLocation } from 'wouter';
import { CheckCircle2, PackageSearch, ArrowRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

function getReferenceFromSearch(search: string): string {
  return new URLSearchParams(search).get('reference') || '';
}

export default function PaymentSuccess() {
  const [location] = useLocation();
  const reference = getReferenceFromSearch(location.includes('?') ? location.slice(location.indexOf('?')) : '');

  return (
    <>
      <SEOHead
        title="Payment Successful - MotorVault"
        description="Your Paystack payment was completed successfully. You can review your order history or continue shopping."
        canonical="/payment/success"
        noIndex
      />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-100 bg-white p-8 sm:p-10 shadow-2xl">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-700">Payment confirmed</p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
            Your payment was successful.
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-700">
            Thanks for your order. We have received the Paystack confirmation and your checkout can now continue from your account history.
          </p>
          {reference ? (
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Reference: <span className="font-semibold text-slate-950">{reference}</span>
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/orders">
              <a className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                View orders
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
            <Link href="/products">
              <a className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50">
                Continue shopping
                <PackageSearch className="h-4 w-4" />
              </a>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
