import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex items-center justify-center min-h-[200px] p-8">
                    <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-xl p-6 text-center">
                        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">Something went wrong</h3>
                        <p className="text-sm text-[#8b949e] mb-4">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#a371f7] text-white rounded-lg text-sm font-medium hover:bg-[#9352e8] transition-colors"
                        >
                            <RefreshCw size={14} />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
