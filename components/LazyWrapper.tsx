"use client";

import React, { lazy, Suspense, ComponentType } from 'react';

// Loading component for better UX
const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
    </div>
);

// Higher-order component for lazy loading
export function withLazyLoading<T extends object>(
    importFunc: () => Promise<{ default: ComponentType<T> }>,
    fallback?: React.ComponentType
) {
    const LazyComponent = lazy(importFunc);

    return function LazyWrapper(props: T) {
        const FallbackComponent = fallback || LoadingSpinner;
        return (
            <Suspense fallback={<FallbackComponent />}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
}

// Error boundary for lazy components
export class LazyErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ComponentType },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode; fallback?: React.ComponentType }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Lazy component error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const Fallback = this.props.fallback;
            return Fallback ? <Fallback /> : (
                <div className="p-4 text-center text-gray-500">
                    Something went wrong. Please try again.
                </div>
            );
        }

        return this.props.children;
    }
}

export default withLazyLoading;