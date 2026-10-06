import { Link, useSearch } from "wouter";
import { AlertTriangle, MessageSquare, ArrowRight } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

function getQueryValue(search: string, key: string): string {
  return new URLSearchParams(search).get(key) || "";
}

export default function PaymentFailed() {
  // wouter's useLocation() is the pathname only; the query string (reference,
  // status, email) has to come from useSearch() or it is always empty.
  const queryString = useSearch();
  const search = queryString ? `?${queryString}` : "";
  const reference = getQueryValue(search, "reference");
  const status = getQueryValue(search, "status");

  return (
    <>
      <SEOHead
        title="Payment Failed - MotorVault"
        description="Your Paystack payment did not complete. You can return to checkout or contact support for help."
        canonical="/payment/failed"
        noIndex
      />
      <div className="min-h-screen bg-gray-50">
        <div className="container py-10 sm:py-16">
          <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-card sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
              <AlertTriangle className="h-7 w-7 text-brand" />
            </div>
            <p className="eyebrow mt-5 !text-brand">Payment not completed</p>
            <h1 className="mt-2 text-ink">We could not confirm the payment.</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-700 sm:text-base">
              If Paystack returned a failed or abandoned status, you can try the
              checkout again. If the payment already went through, contact
              support with the reference so we can verify it.
            </p>
            {reference || status ? (
              <div className="mt-5 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {reference ? (
                  <p>
                    Reference:{" "}
                    <span className="price break-all font-semibold text-ink">
                      {reference}
                    </span>
                  </p>
                ) : null}
                {status ? (
                  <p>
                    Status:{" "}
                    <span className="font-semibold text-ink">{status}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/checkout" className="btn-primary btn-lg">
                Return to checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="btn-secondary btn-lg">
                Contact support
                <MessageSquare className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
