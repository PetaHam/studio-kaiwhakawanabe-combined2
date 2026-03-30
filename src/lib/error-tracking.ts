// Error tracking and monitoring

interface ErrorTracker {
  init: (options: { dsn: string; environment: string }) => void
  captureException: (error: Error, context?: Record<string, any>) => void
  captureMessage: (message: string, level?: 'info' | 'warning' | 'error') => void
  setUser: (user: { id: string; email?: string; username?: string }) => void
}

// Sentry-like error tracker (can be replaced with actual Sentry)
class ErrorTrackerService implements ErrorTracker {
  private isInitialized = false
  private environment = 'development'

  init(options: { dsn: string; environment: string }) {
    this.environment = options.environment
    this.isInitialized = true
    
    if (typeof window !== 'undefined') {
      // Global error handler
      window.addEventListener('error', (event) => {
        this.captureException(event.error)
      })

      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureException(new Error(event.reason))
      })
    }

    console.log('Error tracking initialized:', options.environment)
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.isInitialized) return

    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry/your error tracking service
      console.error('[Error Tracker]', errorData)
      // Example: fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) })
    } else {
      console.error('[Dev Error]', error, context)
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.isInitialized) return

    const data = {
      message,
      level,
      timestamp: new Date().toISOString(),
      environment: this.environment
    }

    if (level === 'error') {
      console.error('[Message]', data)
    } else if (level === 'warning') {
      console.warn('[Message]', data)
    } else {
      console.log('[Message]', data)
    }
  }

  setUser(user: { id: string; email?: string; username?: string }) {
    if (!this.isInitialized) return
    console.log('[User Context]', user)
  }
}

export const errorTracker = new ErrorTrackerService()

// Initialize error tracking
export function initErrorTracking() {
  if (typeof window === 'undefined') return

  errorTracker.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || 'mock-dsn',
    environment: process.env.NODE_ENV || 'development'
  })
}
