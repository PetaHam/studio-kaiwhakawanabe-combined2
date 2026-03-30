"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, X, Flame, BarChart3, Gavel, Calendar, Activity, User, Target, ShieldCheck, MessageSquare, Swords, Users, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';

interface Step {
  target: string;
  title: string;
  content: string;
  icon: React.ReactNode;
  path: string;
}

const TOUR_STEPS: Step[] = [
  {
    target: 'tour-header',
    title: "Welcome, Wanabe!",
    content: 'Judge performances with your whānau and friends from the comfort of your couch.',
    icon: <Gavel className="w-5 h-5 text-primary" />,
    path: '/'
  },
  {
    target: 'tour-judge-card',
    title: 'The Judge’s Chair',
    content: 'This is your entrance to live scoring. Tap here during live events to adjudicate in real-time.',
    icon: <Gavel className="w-5 h-5 text-primary" />,
    path: '/'
  },
  {
    target: 'tour-party-card',
    title: 'Party Up',
    content: 'Gather the panel. Sync your technical hot-takes and school the stadium in a live feed.',
    icon: <MessageSquare className="w-5 h-5 text-primary" />,
    path: '/'
  },
  {
    target: 'tour-draft-card',
    title: 'Tactical Drafting',
    content: 'Build a legacy lineup from iconic performances in history and go up against other players in this PVP experience.',
    icon: <Swords className="w-5 h-5 text-primary" />,
    path: '/'
  },
  {
    target: 'tour-settings-card',
    title: 'Judge Settings',
    content: 'Quick access to customize your persona, toggle dark mode, or restart this guide.',
    icon: <SettingsIcon className="w-5 h-5 text-primary" />,
    path: '/'
  },
  {
    target: 'tour-dashboard-trigger',
    title: 'Tactical Dashboard',
    content: 'Check your Daily Rituals and Shards status here. During live seasons, rewards are DOUBLED!',
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    path: '/'
  },
  {
    target: 'tour-live-feed',
    title: 'Regional Hub',
    content: 'Browse the live circuit. Toggle between your personal favorites and the global schedule to find the next live performance.',
    icon: <Activity className="w-5 h-5 text-primary" />,
    path: '/vote'
  },
  {
    target: 'tour-create-party',
    title: 'Start an Arena Party',
    content: 'Launch a private discussion node. Sync your technical marks and debate performance nuances with peers in real-time.',
    icon: <Users className="w-5 h-5 text-primary" />,
    path: '/vote'
  },
  {
    target: 'tour-draft-builder',
    title: 'Forge the Winning Bracket',
    content: 'Select iconic items in the repertoire section from respected top-tier roopu across the kapa haka timeline to form your ultimate performance. Curate a S-tier bracket for stage dominance.',
    icon: <Target className="w-5 h-5 text-primary" />,
    path: '/matchups'
  },
  {
    target: 'tour-synergy',
    title: 'Winning Strategy',
    content: 'Use 6 unique roopu for a Diversity Bonus, or stick to one region for stat buffs. Strategy is key to your group\'s success.',
    icon: <ShieldCheck className="w-5 h-5 text-green-600" />,
    path: '/matchups'
  },
  {
    target: 'tour-scout-collection',
    title: 'Item vs Item Clash',
    content: "Your custom group will battle head-to-head using the items you've selected. Earn Mana shards to gain access to legendary groups from the past and utilise items from their brackets to strengthen your repertoire.",
    icon: <Swords className="w-5 h-5 text-primary" />,
    path: '/matchups'
  },
  {
    target: 'tour-poll',
    title: 'Daily Pulse',
    content: 'Vote once a day for an iconic performance to set the global community consensus.',
    icon: <BarChart3 className="w-5 h-5 text-primary" />,
    path: '/'
  },
  {
    target: 'tour-events-list',
    title: 'Qualifying Map',
    content: 'Quickly track every regional final leading to Te Matatini 2027.',
    icon: <Calendar className="w-5 h-5 text-blue-500" />,
    path: '/events'
  },
  {
    target: 'tour-profile-stats',
    title: 'Your Persona',
    content: 'Review your reputation and customize your visual identity in the stadium.',
    icon: <User className="w-5 h-5 text-primary" />,
    path: '/profile'
  }
];

export function TutorialTour() {
  const { user } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  
  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc(userRef);

  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Effect to lock body scroll when tutorial is active
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  const updateHighlight = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    const element = document.getElementById(step.target);
    if (element) {
      setRect(element.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (profile && profile.hasCompletedTutorial === false && !isVisible) {
      const timer = setTimeout(() => {
        setCurrentStep(0);
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const step = TOUR_STEPS[currentStep];
    
    if (pathname !== step.path) {
      setIsTransitioning(true);
      setRect(null);
      router.push(step.path);
      return;
    }

    const landingTimer = setTimeout(() => {
      setIsTransitioning(false);
      
      const checkInterval = setInterval(() => {
        const element = document.getElementById(step.target);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(updateHighlight, 400);
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }, 800);

    window.addEventListener('scroll', updateHighlight);
    window.addEventListener('resize', updateHighlight);
    
    return () => {
      clearTimeout(landingTimer);
      window.removeEventListener('scroll', updateHighlight);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [currentStep, isVisible, updateHighlight, pathname, router]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    if (user) {
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        hasCompletedTutorial: true,
        updatedAt: serverTimestamp()
      });
    }
    setIsVisible(false);
  };

  if (!isVisible || !profile) return null;

  const padding = 12;
  const step = TOUR_STEPS[currentStep];

  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { opacity: 0 };

    const navHeight = 80; // navigation bar height
    const margin = 24;
    
    // If the spotlight is in the bottom half of the viewport, put the window at the top
    const isBottomHalf = (rect.top + rect.height / 2) > (window.innerHeight / 2);

    return {
      position: 'fixed',
      top: isBottomHalf ? `${margin}px` : 'auto',
      // Ensure it stays above the bottom menu list
      bottom: isBottomHalf ? 'auto' : `${navHeight + margin}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10001, // Extreme priority to stay in front
      width: 'calc(100% - 40px)',
      maxWidth: '340px',
      pointerEvents: 'auto',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[10000] transition-opacity duration-500 pointer-events-none",
      isTransitioning ? "opacity-0" : "opacity-100"
    )}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - padding}
                y={rect.top - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx={24}
                fill="black"
                className="transition-all duration-500 ease-in-out"
              />
            )}
          </mask>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(0,0,0,0.8)" 
          mask="url(#spotlight-mask)" 
          className="pointer-events-auto"
        />
      </svg>

      <div 
        className="animate-in slide-in-from-bottom-4 fade-in duration-500"
        style={getTooltipStyle()}
      >
        <Card className="bg-card border-4 border-primary/20 shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden">
          <div className="h-2 w-full bg-primary/10">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out" 
              style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }} 
            />
          </div>
          <CardContent className="p-8 space-y-6">
            <header className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner ring-4 ring-primary/5">
                {step.icon}
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/10 transition-colors" onClick={completeTour}>
                <X className="w-5 h-5 text-muted-foreground" />
              </Button>
            </header>

            <div className="space-y-3">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-primary leading-none">
                {step.title}
              </h3>
              <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                {step.content}
              </p>
            </div>

            <footer className="flex items-center justify-between pt-4">
              <Button variant="ghost" size="sm" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary px-0 h-auto" onClick={completeTour}>
                Skip Tour
              </Button>
              <Button size="sm" className="font-black uppercase italic gap-3 h-12 px-8 rounded-full shadow-2xl shadow-primary/30 text-xs text-slate-950" onClick={handleNext}>
                {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-5 h-5" />
              </Button>
            </footer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
