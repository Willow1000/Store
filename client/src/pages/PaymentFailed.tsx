import { Link, useLocation } from 'wouter';
import { AlertTriangle, MessageSquare, ArrowRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

function getQueryValue(search: string, key: string): string {
  return new URLSearchParams(search).get(key) || '';
}

export default function PaymentFailed() {
  const [location] = useLocation();
  const search = location.includes('?') ? location.slice(location.indexOf('?')) : '';
  const reference = getQueryValue(search, 'reference');
  const status = getQueryValue(search, 'status');

  return (
    <>
      <SEOHead
        title="Payment Failed - MotorVault"
        description="Your Paystack payment did not complete. You can return to checkout or contact support for help."
        canonical="/payment/failed"
      />
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-100 bg-white p-8 sm:p-10 shadow-2xl">
          <AlertTriangle className="h-14 w-14 text-rose-600" />
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">Payment not completed</p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
            We could not confirm the payment.
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-700">
            If Paystack returned a failed or abandoned status, you can try the checkout again. If the payment already went through, contact support with the reference so we can verify it.
          </p>
          <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {reference ? <p>Reference: <span className="font-semibold text-slate-950">{reference}</span></p> : null}
            {status ? <p>Status: <span className="font-semibold text-slate-950">{status}</span></p> : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/checkout">
              <a className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                Return to checkout
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
            <Link href="/contact">
              <a className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50">
                Contact support
                <MessageSquare className="h-4 w-4" />
              </a>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
