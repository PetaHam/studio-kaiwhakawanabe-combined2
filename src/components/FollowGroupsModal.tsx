"use client"
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { FollowGroupsList } from '@/components/FollowGroupsList'
import { calculateMajorityRegionColor } from '@/lib/team-regions'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { doc, serverTimestamp } from 'firebase/firestore'
import { useFirestore, useUser, useDoc } from '@/firebase'
import { toast } from '@/hooks/use-toast'

export function FollowGroupsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useUser()
  const db = useFirestore()
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const userRef = user ? doc(db, 'users', user.uid) : null
  const { data: profile } = useDoc(userRef)

  useEffect(() => {
    if (isOpen && profile?.favoriteTeamIds) {
      setSelectedTeams(profile.favoriteTeamIds)
    } else if (isOpen) {
      setSelectedTeams([])
    }
  }, [isOpen, profile])

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev => 
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    )
  }

  const handleSave = () => {
    if (!user) return;
    setIsSaving(true);
    const newColor = calculateMajorityRegionColor(selectedTeams);
    
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { 
      favoriteTeamIds: selectedTeams,
      profileColor: newColor,
      updatedAt: serverTimestamp() 
    });
    
    toast({ title: "Allegiances Updated!", description: "Your groups and regional theme have been synced." });
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 600);
  }

  const currentThemeColor = calculateMajorityRegionColor(selectedTeams);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[3rem] max-w-[400px] p-6 border-2 bg-white shadow-2xl overflow-hidden" style={{ borderColor: `${currentThemeColor}40` }}>
        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: currentThemeColor }} />
        <DialogHeader className="mb-4 mt-2">
          <DialogTitle className="flex items-center justify-center gap-2 uppercase italic font-black text-2xl text-slate-950">
            <Heart className="w-6 h-6" style={{ color: currentThemeColor }} /> ROOPU FOLLOWED
          </DialogTitle>
          <DialogDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 mt-2">
            Pledge your allegiance to shift your global theme color.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <FollowGroupsList selectedTeams={selectedTeams} onToggleTeam={toggleTeam} height={320} />
          
          <Button 
            className="w-full h-14 text-white font-black italic uppercase text-sm shadow-xl rounded-2xl transition-all active:scale-95" 
            style={{ backgroundColor: currentThemeColor }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "SYNCING..." : "SAVE ALLIANCES"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
