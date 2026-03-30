'use client'

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  // Measure component render time
  static measureRender(componentName: string, callback: () => void) {
    if (typeof window === 'undefined') return callback()
    
    const start = performance.now()
    callback()
    const end = performance.now()
    
    this.recordMetric(`render_${componentName}`, end - start)
  }

  // Measure async operations
  static async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (typeof window === 'undefined') return operation()
    
    const start = performance.now()
    const result = await operation()
    const end = performance.now()
    
    this.recordMetric(operationName, end - start)
    return result
  }

  // Record metric
  private static recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(duration)
    
    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
    }
  }

  // Get performance report
  static getReport() {
    const report: Record<string, { avg: number; max: number; min: number; count: number }> = {}
    
    this.metrics.forEach((durations, name) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const max = Math.max(...durations)
      const min = Math.min(...durations)
      
      report[name] = {
        avg: parseFloat(avg.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        count: durations.length
      }
    })
    
    return report
  }

  // Clear metrics
  static clearMetrics() {
    this.metrics.clear()
  }
}

// Web Vitals monitoring
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vital:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating
    })
  }
  
  // In production, you would send this to analytics
  // Example: sendToAnalytics(metric)
}

// Image loading optimization
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

// Lazy load images when in viewport
export function lazyLoadImage(element: HTMLImageElement, src: string) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          element.src = src
          observer.unobserve(element)
        }
      })
    })
    observer.observe(element)
  } else {
    // Fallback for older browsers
    element.src = src
  }
}
