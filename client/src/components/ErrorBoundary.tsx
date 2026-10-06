import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white p-6">
          <div className="flex w-full max-w-lg flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
              <AlertTriangle size={26} className="text-brand" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-ink">
              An unexpected error occurred.
            </h2>

            {/* The stack trace is for developers; shoppers only get the reload. */}
            {import.meta.env.DEV && (
              <div className="mt-5 max-h-64 w-full overflow-auto rounded-lg bg-muted p-4 text-left">
                <pre className="whitespace-break-spaces text-xs text-muted-foreground">
                  {this.state.error?.stack}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-6"
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
