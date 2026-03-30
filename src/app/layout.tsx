
import type {Metadata} from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ManaBackground } from '@/components/ManaBackground';
import { CustomBackground } from '@/components/CustomBackground';
import { AmbientGlow } from '@/components/AmbientGlow';
import { TutorialTour } from '@/components/TutorialTour';
import { FloatingArenaLink } from '@/components/FloatingArenaLink';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WelcomeModal } from '@/components/WelcomeModal';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { BattleSettingsProvider } from '@/contexts/BattleSettingsContext';

export const metadata: Metadata = {
  title: 'Kaiwhakawānabe – The Couch Judge',
  description: 'Live Kapa Haka Fan Judging & Engagement',
  manifest: '/manifest.json',
  themeColor: '#FF4500',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kapa Haka Judge',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF4500" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-body antialiased bg-white text-foreground min-h-screen selection:bg-primary/30 relative">
        <ServiceWorkerRegistration />
        <ErrorBoundary>
          <FirebaseClientProvider>
            <BattleSettingsProvider>
              {/* Layered Branding Background */}
              <AmbientGlow />
              <CustomBackground />
              <ManaBackground />
              
              <TutorialTour />
              <FloatingArenaLink />
              <WelcomeModal />
              
              <main className="max-w-md mx-auto w-full px-4 pt-6 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out relative z-10">
                {children}
              </main>
              
              <Navigation />
              <Toaster />
            </BattleSettingsProvider>
          </FirebaseClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
