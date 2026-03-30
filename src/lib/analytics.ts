// Analytics tracking

interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
}

class AnalyticsService {
  private isInitialized = false

  init(trackingId?: string) {
    if (typeof window === 'undefined') return

    this.isInitialized = true

    // Initialize Google Analytics
    if (trackingId && process.env.NODE_ENV === 'production') {
      const script = document.createElement('script')
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`
      script.async = true
      document.head.appendChild(script)

      // @ts-ignore
      window.dataLayer = window.dataLayer || []
      // @ts-ignore
      window.gtag = function() { window.dataLayer.push(arguments) }
      // @ts-ignore
      window.gtag('js', new Date())
      // @ts-ignore
      window.gtag('config', trackingId)
    }

    console.log('Analytics initialized')
  }

  trackEvent(event: AnalyticsEvent) {
    if (!this.isInitialized) return

    if (process.env.NODE_ENV === 'production') {
      // @ts-ignore
      if (window.gtag) {
        // @ts-ignore
        window.gtag('event', event.name, event.properties)
      }
    } else {
      console.log('[Analytics]', event)
    }
  }

  trackPageView(path: string) {
    this.trackEvent({
      name: 'page_view',
      properties: {
        page_path: path,
        page_title: document.title
      }
    })
  }

  trackUser(userId: string, properties?: Record<string, any>) {
    if (!this.isInitialized) return

    if (process.env.NODE_ENV === 'production') {
      // @ts-ignore
      if (window.gtag) {
        // @ts-ignore
        window.gtag('set', { user_id: userId, ...properties })
      }
    } else {
      console.log('[Analytics User]', userId, properties)
    }
  }

  // Common event trackers
  trackClick(elementName: string, properties?: Record<string, any>) {
    this.trackEvent({
      name: 'click',
      properties: {
        element: elementName,
        ...properties
      }
    })
  }

  trackFormSubmit(formName: string, properties?: Record<string, any>) {
    this.trackEvent({
      name: 'form_submit',
      properties: {
        form: formName,
        ...properties
      }
    })
  }

  trackPurchase(value: number, currency: string = 'NZD', properties?: Record<string, any>) {
    this.trackEvent({
      name: 'purchase',
      properties: {
        value,
        currency,
        ...properties
      }
    })
  }
}

export const analytics = new AnalyticsService()

// Initialize analytics
export function initAnalytics() {
  if (typeof window === 'undefined') return
  
  const trackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID
  analytics.init(trackingId)
}

// Hook for tracking page views
export function usePageTracking() {
  if (typeof window === 'undefined') return

  const pathname = window.location.pathname
  analytics.trackPageView(pathname)
}
