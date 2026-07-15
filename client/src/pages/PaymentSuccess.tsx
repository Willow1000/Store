import { Link, useLocation } from 'wouter';
import { CheckCircle2, PackageSearch, ArrowRight, MailCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SEOHead } from '@/components/SEOHead';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function getReferenceFromSearch(search: string): string {
  return new URLSearchParams(search).get('reference') || '';
}

function getEmailFromSearch(search: string): string {
  return new URLSearchParams(search).get('email') || '';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PaymentSuccess() {
  const [location] = useLocation();
  const [popupOpen, setPopupOpen] = useState(false);
  const search = location.includes('?') ? location.slice(location.indexOf('?')) : '';
  const reference = getReferenceFromSearch(search);
  const rawRecipientEmail = getEmailFromSearch(search);
  const recipientEmail = useMemo(() => (isValidEmail(rawRecipientEmail) ? rawRecipientEmail : ''), [rawRecipientEmail]);

  useEffect(() => {
    setPopupOpen(true);
  }, []);

  return (
    <>
      <SEOHead
        title="Payment Successful - MotorVault"
        description="Your Paystack payment was completed successfully. You can review your order history or continue shopping."
        canonical="/payment/success"
        noIndex
      />
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MailCheck className="h-5 w-5 text-emerald-600" />
              Confirmation Email Sent
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed text-slate-700">
              A confirmation containing your receipt has been sent to{' '}
              <span className="font-semibold text-slate-950">{recipientEmail || 'your email address'}</span>.{' '}
              If you do not see it in your inbox, please check your spam folder.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
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
          <p className="mt-3 text-sm text-slate-700">
            Your confirmation receipt email was sent to{' '}
            <span className="font-semibold text-slate-950">{recipientEmail || 'your email address'}</span>. If it is not in inbox,
            check spam folder.
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
