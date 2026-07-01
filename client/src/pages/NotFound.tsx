import { Link } from 'wouter';
import { Home } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background w-full overflow-x-hidden">
      <SEOHead
        title="404 | Page Not Found | MotorVault"
        description="The page you are looking for does not exist on MotorVault."
        canonical="/404"
        noIndex
        noFollow
      />
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-2xl font-semibold mb-2">Page Not Found</p>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
        <Link href="/">
          <a className="btn-primary inline-flex items-center gap-2">
            <Home size={18} />
            Back to Home
          </a>
        </Link>
      </div>
    </div>
  );
}
