import { Link, useSearch } from "wouter";
import {
  CheckCircle2,
  PackageSearch,
  ArrowRight,
  MailCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getReferenceFromSearch(search: string): string {
  return new URLSearchParams(search).get("reference") || "";
}

function getEmailFromSearch(search: string): string {
  return new URLSearchParams(search).get("email") || "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PaymentSuccess() {
  // wouter's useLocation() is the pathname only; the query string (reference,
  // status, email) has to come from useSearch() or it is always empty.
  const queryString = useSearch();
  const [popupOpen, setPopupOpen] = useState(false);
  const search = queryString ? `?${queryString}` : "";
  const reference = getReferenceFromSearch(search);
  const rawRecipientEmail = getEmailFromSearch(search);
  const recipientEmail = useMemo(
    () => (isValidEmail(rawRecipientEmail) ? rawRecipientEmail : ""),
    [rawRecipientEmail]
  );

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
              <MailCheck className="h-5 w-5 text-success" />
              Confirmation Email Sent
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed text-gray-700">
              A confirmation containing your receipt has been sent to{" "}
              <span className="font-semibold text-ink">
                {recipientEmail || "your email address"}
              </span>
              . If you do not see it in your inbox, please check your spam
              folder.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-gray-50">
        <div className="container py-10 sm:py-16">
          <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-card sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <p className="eyebrow mt-5 !text-success">Payment confirmed</p>
            <h1 className="mt-2 text-ink">Your payment was successful.</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-700 sm:text-base">
              Thanks for your order. We have received the Paystack confirmation
              and your checkout can now continue from your account history.
            </p>
            <p className="mt-3 text-sm text-gray-700">
              Your confirmation receipt email was sent to{" "}
              <span className="font-semibold text-ink">
                {recipientEmail || "your email address"}
              </span>
              . If it is not in inbox, check spam folder.
            </p>
            {reference ? (
              <p className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Reference:{" "}
                <span className="price break-all font-semibold text-ink">
                  {reference}
                </span>
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/orders" className="btn-primary btn-lg">
                View orders
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/products" className="btn-secondary btn-lg">
                Continue shopping
                <PackageSearch className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
