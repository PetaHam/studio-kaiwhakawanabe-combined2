'use client'

import { usePathname } from 'next/navigation'

interface StructuredDataProps {
  type: 'WebApplication' | 'Organization' | 'BreadcrumbList' | 'Person'
  data: Record<string, any>
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// App-level structured data
export function AppStructuredData() {
  const appData = {
    name: 'Kaiwhakawānabe – The Couch Judge',
    applicationCategory: 'Entertainment',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'NZD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250'
    },
    description: 'Live Kapa Haka Fan Judging & Engagement Platform',
  }

  return <StructuredData type="WebApplication" data={appData} />
}

// Organization structured data
export function OrganizationStructuredData() {
  const orgData = {
    name: 'Kaiwhakawānabe',
    url: 'https://kapa-haka-judge.com',
    logo: 'https://kapa-haka-judge.com/logo.png',
    description: 'The ultimate Kapa Haka fan judging platform',
    sameAs: [
      // Add social media URLs here
    ]
  }

  return <StructuredData type="Organization" data={orgData} />
}
