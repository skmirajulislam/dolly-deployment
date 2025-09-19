// Performance monitoring utilities for frontend optimization
import React from 'react';

// Web API type definitions
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceMetrics {
  component: string;
  renderTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private renderTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start measuring render time
  startRender(componentName: string): void {
    if (typeof performance !== 'undefined') {
      this.renderTimes.set(componentName, performance.now());
    }
  }

  // End measuring and record render time
  endRender(componentName: string): void {
    if (typeof performance !== 'undefined' && this.renderTimes.has(componentName)) {
      const startTime = this.renderTimes.get(componentName)!;
      const renderTime = performance.now() - startTime;

      this.metrics.push({
        component: componentName,
        renderTime,
        timestamp: Date.now(),
      });

      this.renderTimes.delete(componentName);

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 100) {
        console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    }
  }

  // Get performance metrics for analysis
  getMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      return this.metrics.filter(m => m.component === componentName);
    }
    return [...this.metrics];
  }

  // Clear old metrics to prevent memory leaks
  clearMetrics(): void {
    this.metrics = [];
  }

  // Get average render time for a component
  getAverageRenderTime(componentName: string): number {
    const componentMetrics = this.getMetrics(componentName);
    if (componentMetrics.length === 0) return 0;

    const total = componentMetrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / componentMetrics.length;
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();

  React.useEffect(() => {
    monitor.startRender(componentName);
    return () => {
      monitor.endRender(componentName);
    };
  });
}

// HOC for automatic performance monitoring
export function withPerformanceMonitoring<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
) {
  const WithPerformanceComponent = (props: T) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'UnknownComponent';
    usePerformanceMonitor(name);
    return <WrappedComponent {...props} />;
  };

  WithPerformanceComponent.displayName =
    `withPerformanceMonitoring(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithPerformanceComponent;
}

// Web Vitals monitoring
export function initWebVitals() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Monitor LCP (Largest Contentful Paint)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Monitor FID (First Input Delay)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        console.log('FID:', fidEntry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Monitor CLS (Cumulative Layout Shift)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        const clsEntry = entry as LayoutShift;
        if (!clsEntry.hadRecentInput) {
          console.log('CLS:', clsEntry.value);
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

export default PerformanceMonitor;