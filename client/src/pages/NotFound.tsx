import { Link } from "wouter";
import { Home } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useMarkNotFound } from "@/lib/ssrStatus";

export default function NotFound() {
  useMarkNotFound();
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center bg-white">
      <SEOHead
        title="404 | Page Not Found | MotorVault"
        description="The page you are looking for does not exist on MotorVault."
        canonical="/404"
        noIndex
        noFollow
      />
      <div className="container py-16 text-center">
        <p className="price font-display text-7xl font-extrabold leading-none text-ink sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-ink">Page Not Found</h1>
        <p className="mt-2 text-gray-600">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">
            <Home size={18} />
            Back to Home
          </Link>
          <Link href="/products" className="btn-secondary">
            All Products
          </Link>
        </div>
      </div>
    </div>
  );
}
