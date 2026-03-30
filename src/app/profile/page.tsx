
"use client"

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
 LogOut, Star, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown,
 Zap, Heart, Palette, Smartphone, Globe, Copy, ChevronLeft, ChevronRight, Settings as SettingsIcon, RotateCcw, PartyPopper, Flame, X, Camera, Image as ImageIcon, Upload, ShieldAlert, UserPlus
} from 'lucide-react'
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase'
import { doc, serverTimestamp } from 'firebase/firestore'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { signOut } from 'firebase/auth'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'

export default function ProfilePage() {
 const router = useRouter()
 const auth = useAuth()
 const { user } = useUser()
 const db = useFirestore()
 const fileInputRef = useRef<HTMLInputElement>(null)
 
 const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user])
 const { data: profile } = useDoc(userRef)

 const [newName, setNewName] = useState('')
 const [isSettingsOpen, setIsSettingsOpen] = useState(false)
 const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
 const [tempPhotoUrl, setTempPhotoUrl] = useState('')
 const [photoFit, setPhotoFit] = useState<'cover' | 'contain'>('cover')
 const [isUploading, setIsUploading] = useState(false)

 useEffect(() => { 
   if (profile) {
     setNewName(profile.displayName || '')
     setTempPhotoUrl(profile.profileImageUrl || '')
     setPhotoFit(profile.profileImageFit || 'cover')
   }
 }, [profile])

 const hearts = profile?.receivedHearts || 0
 const status = useMemo(() => {
   if (hearts >= 50) return "Grand Chancellor"
   if (hearts >= 20) return "Supreme Adjudicator"
   if (hearts >= 5) return "Head Judge"
   return "Candidate Judge"
 }, [hearts])

 const handleSignOut = async () => { await signOut(auth); router.replace('/login'); }
 const handleCopyJudgeID = () => {
   const id = profile?.shortId || user?.uid.slice(0, 6).toUpperCase();
   navigator.clipboard.writeText(id!); toast({ title: "Judge ID Copied!" })
 }

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0]
   if (!file) return

   if (file.size > 1024 * 1024) {
     toast({ 
       title: "File Too Large", 
       description: "Please select an image under 1MB for stadium optimization.", 
       variant: "destructive" 
     })
     return
   }

   setIsUploading(true)
   const reader = new FileReader()
   reader.onload = (event) => {
     const result = event.target?.result as string
     setTempPhotoUrl(result)
     setIsUploading(false)
     toast({ title: "Photo Loaded", description: "Review the preview before applying changes." })
   }
   reader.readAsDataURL(file)
 }

 const handleSavePhoto = () => {
   if (!userRef) return
   updateDocumentNonBlocking(userRef, {
     profileImageUrl: tempPhotoUrl.trim(),
     profileImageFit: photoFit,
     updatedAt: serverTimestamp()
   })
   toast({ title: "Avatar Updated!", description: "Your stadium persona has been refreshed." })
   setIsPhotoDialogOpen(false)
 }

 return (
   <div className="min-h-screen pb-24 relative">
     <header className="sticky top-4 z-40 px-1">
       <div className="bg-white/80 backdrop-blur-lg border rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between">
         <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="h-10 w-10 rounded-full"><ChevronLeft /></Button>
           <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-950">PROFILE</h1>
         </div>
         <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
           <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full shadow-sm"><SettingsIcon className="w-5 h-5 text-primary" /></Button></SheetTrigger>
           <SheetContent className="rounded-l-[2.5rem] w-[90%] bg-white p-0 overflow-hidden border-none shadow-2xl">
             <div className="h-2 w-full bg-primary" />
             <SheetHeader className="p-8 pb-4">
               <SheetTitle className="uppercase italic font-black text-2xl">Settings</SheetTitle>
               <SheetDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Manage your persona and preferences.</SheetDescription>
             </SheetHeader>
             <ScrollArea className="h-[calc(100vh-180px)] px-8">
               <div className="space-y-8 py-4">
                 <div className="space-y-4">
                   <Label className="text-[9px] font-black uppercase text-primary">Identity</Label>
                   <div className="flex gap-2">
                     <input value={newName} onChange={e => setNewName(e.target.value)} className="flex h-12 w-full px-4 text-xs rounded-xl bg-slate-50 border-none" />
                     <Button size="sm" className="rounded-xl font-black uppercase italic shadow-lg" onClick={() => { updateDocumentNonBlocking(userRef!, { displayName: newName.trim(), updatedAt: serverTimestamp() }); toast({ title: "Name Updated!" }) }}>Save</Button>
                   </div>
                 </div>
                 
                 <div className="pt-4 space-y-3">
                   {user?.isAnonymous ? (
                     <Button className="w-full justify-start gap-4 h-14 rounded-2xl bg-primary text-white font-black uppercase italic text-sm shadow-lg" onClick={() => router.push('/login')}>
                       <UserPlus className="w-5 h-5" /> UPGRADE ACCOUNT
                     </Button>
                   ) : (
                     <Button variant="ghost" className="w-full justify-start gap-4 h-14 rounded-2xl text-muted-foreground hover:text-destructive font-black uppercase italic text-sm" onClick={handleSignOut}>
                       <LogOut className="w-5 h-5" /> Sign Out
                     </Button>
                   )}
                   {user?.isAnonymous && (
                     <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl text-slate-400 font-black uppercase italic text-[10px]" onClick={handleSignOut}>
                       <LogOut className="w-4 h-4" /> Exit Guest Mode
                     </Button>
                   )}
                 </div>

                 <Dialog>
                   <DialogTrigger asChild><button className="w-full text-center py-4 text-[7px] font-black uppercase tracking-[0.4em] text-slate-300 hover:text-primary">Ngā Mihi Motuhake</button></DialogTrigger>
                   <DialogContent className="max-w-[380px] rounded-[2.5rem] border bg-white p-0 overflow-hidden shadow-2xl">
                     <div className="h-2 w-full bg-primary" />
                     <ScrollArea className="max-h-[80vh] p-8">
                       <div className="space-y-6">
                         <h2 className="text-2xl font-black italic uppercase text-center">Special Thanks</h2>
                         <div className="space-y-4 text-[13px] font-medium leading-relaxed text-slate-600 italic">
                           <p>This app is the labour of love from one stubborn Kapa Haka fan who spent countless late nights designing, building, chasing data, wrangling photos, and debugging at 2 a.m. — all for us fans.</p>
                           <p>Still plenty of bugs to squash, but I do it for the pure love of Kapa Haka.</p>
                           <p>He mihi nui ki ngā kapa katoa — this app exists because of you.</p>
                           <div className="pt-2 border-t border-slate-100 mt-2">
                             <p>to those who have raru about a particular roopus stats in the drafting section.. <span className="font-black text-slate-950 uppercase not-italic">Remember: They're just numbers on a screen.</span></p>
                           </div>
                           <p>Placings are pulled straight from official major comp results — no secret sauce here. If your group ranks lower than expected… blame the judges, not the one-person operation behind this keyboard.</p>
                           <p>Nowhere near perfect, but built with aroha and too many sleepless nights.</p>
                           <p className="text-primary font-black uppercase not-italic tracking-tighter">Mo ake tonu atu te oranga o te kapa haka.</p>
                           <div className="pt-4 border-t"><p className="text-xs font-black uppercase">Nga mihi,</p><p className="text-lg font-black italic text-primary">Peta.</p></div>
                         </div>
                       </div>
                     </ScrollArea>
                     <div className="p-6 bg-slate-50/50"><DialogFooter><DialogClose asChild><Button variant="ghost" className="w-full font-black uppercase italic rounded-xl text-slate-400">Close</Button></DialogClose></DialogFooter></div>
                   </DialogContent>
                 </Dialog>
               </div>
             </ScrollArea>
           </SheetContent>
         </Sheet>
       </div>
     </header>

     <div className="p-4 space-y-10">
       {user?.isAnonymous && (
         <Card className="mx-1 border-2 border-dashed border-primary/20 bg-primary/5 rounded-3xl overflow-hidden animate-in slide-in-from-top-2 duration-500">
           <CardContent className="p-6 flex items-center gap-4">
             <div className="p-3 rounded-2xl bg-primary text-white shadow-lg">
               <ShieldAlert className="w-6 h-6" />
             </div>
             <div className="flex-1 space-y-1">
               <p className="text-[11px] font-black uppercase italic leading-none">Guest Data warning</p>
               <p className="text-[8px] font-bold text-slate-500 uppercase leading-tight tracking-wider">
                 Your persona and shards are stored locally. Upgrade to ensure they persist across sessions.
               </p>
             </div>
             <Button size="sm" className="h-9 px-4 rounded-xl bg-slate-950 text-white font-black text-[9px] uppercase italic" onClick={() => router.push('/login')}>UPGRADE</Button>
           </CardContent>
         </Card>
       )}

       <header className="flex flex-col items-center gap-6 py-8">
         <div className="relative group">
           <Avatar className="w-56 h-56 border-4 shadow-2xl border-primary/20 bg-slate-50">
             <AvatarImage 
               src={profile?.profileImageUrl || `https://picsum.photos/seed/${user?.uid}/200/200`} 
               className={cn("transition-all duration-500", profile?.profileImageFit === 'contain' ? "object-contain" : "object-cover")} 
             />
             <AvatarFallback className="bg-slate-100 text-6xl font-black">{profile?.displayName?.[0]}</AvatarFallback>
           </Avatar>
           <button 
             onClick={() => setIsPhotoDialogOpen(true)}
             className="absolute bottom-2 right-2 p-3 rounded-full bg-slate-900/40 text-white backdrop-blur-md opacity-20 group-hover:opacity-100 hover:bg-primary transition-all duration-300 border border-white/20 shadow-xl"
           >
             <Camera className="w-5 h-5" />
           </button>
         </div>

         <div className="text-center space-y-4">
           <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-950">{profile?.displayName || 'Couch Judge'}</h1>
           <Badge className="bg-primary text-white px-6 py-2 shadow-lg border-none uppercase italic font-black tracking-widest">{status}</Badge>
           <div className="flex justify-center pt-2">
             <Badge variant="outline" className="text-[10px] font-black uppercase border flex items-center gap-2 px-5 py-2 bg-white/80 cursor-pointer shadow-sm hover:border-primary transition-all rounded-full" onClick={handleCopyJudgeID}>
               Judge ID: {profile?.shortId || '...'} <Copy className="w-3.5 h-3.5 text-primary" />
             </Badge>
           </div>
         </div>
       </header>

       <Card className="bg-white border shadow-xl rounded-[2.5rem] overflow-hidden mx-1">
         <div className="p-8 space-y-6 text-center">
           <div className="flex justify-between items-center px-4">
             <div className="flex items-center gap-4"><Flame className="w-7 h-7 text-primary" /><h3 className="text-lg font-black uppercase italic text-slate-950">Shards Pool</h3></div>
             <span className="text-4xl font-black italic text-primary tabular-nums">{(profile?.criticPoints || 0) + (profile?.purchasedMana || 0) - (profile?.manaSpent || 0)}</span>
           </div>
           <Progress value={Math.min(100, (hearts / 50) * 100)} className="h-4 bg-slate-100" indicatorClassName="bg-primary shadow-sm" />
         </div>
       </Card>

       <div className="grid grid-cols-4 gap-4 px-1">
         {[
           { icon: ThumbsUp, color: 'text-green-500', value: profile?.likedPoints || 0, label: 'Favour' },
           { icon: ThumbsDown, color: 'text-red-500', value: profile?.dislikedPoints || 0, label: 'Impact' },
           { icon: Flame, color: 'text-orange-500', value: profile?.vibePoints || 0, label: 'Vibe' },
           { icon: Heart, color: 'text-primary', value: hearts, label: 'Luv', fill: true }
         ].map((stat, i) => (
           <Card key={i} className="bg-white border shadow-md rounded-2xl p-4 flex flex-col items-center gap-2">
             <stat.icon className={cn("w-6 h-6", stat.color, stat.fill && "fill-current")} />
             <span className={cn("text-xl font-black italic tabular-nums", stat.color)}>{stat.value}</span>
             <span className="text-[8px] font-black text-muted-foreground uppercase text-center tracking-widest">{stat.label}</span>
           </Card>
         ))}
       </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard profile={profile} className="px-1" />

     </div>

     <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
       <DialogContent className="max-w-[360px] max-h-[90vh] flex flex-col rounded-[2.5rem] border border-slate-200 bg-white p-0 overflow-hidden shadow-2xl">
         <DialogHeader className="p-8 pb-0">
           <DialogTitle className="uppercase italic font-black text-2xl text-slate-950 flex items-center gap-2">
             <ImageIcon className="w-6 h-6 text-primary" /> Update Persona
           </DialogTitle>
           <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-1">
             Refresh your visual identity in the arena
           </DialogDescription>
         </DialogHeader>
         
         <ScrollArea className="flex-1 px-8">
           <div className="space-y-6 py-6">
             <div className="flex justify-center">
               <div className="w-32 h-32 rounded-full border-4 border-slate-100 overflow-hidden shadow-inner bg-slate-50 relative">
                 {tempPhotoUrl ? (
                   <img src={tempPhotoUrl} alt="Preview" className={cn("w-full h-full transition-all", photoFit === 'cover' ? "object-cover" : "object-contain")} />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-200"><Camera className="w-8 h-8" /></div>
                 )}
                 {isUploading && (
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                     <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   </div>
                 )}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Device Access</Label>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 className="hidden" 
                 accept="image/*"
                 onChange={handleFileSelect}
               />
               <Button 
                 variant="outline" 
                 className="w-full h-12 rounded-xl border-2 border-dashed bg-slate-50 border-slate-200 hover:border-primary group transition-all"
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading}
               >
                 <Upload className="w-4 h-4 mr-2 text-primary group-hover:animate-bounce" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Choose Photo from device</span>
               </Button>
             </div>

             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="space-y-0.5">
                 <Label className="text-[10px] font-black uppercase text-slate-950">Fit to size</Label>
                 <p className="text-[8px] font-bold text-muted-foreground uppercase">Toggle aspect ratio handling</p>
               </div>
               <Switch 
                 checked={photoFit === 'contain'} 
                 onCheckedChange={(checked) => setPhotoFit(checked ? 'contain' : 'cover')}
                 className="data-[state=checked]:bg-primary"
               />
             </div>
           </div>
         </ScrollArea>

         <DialogFooter className="p-8 pt-0 flex-col gap-3 sm:flex-col">
           <Button className="w-full font-black uppercase italic h-14 rounded-2xl shadow-xl text-slate-950" onClick={handleSavePhoto} disabled={isUploading || !tempPhotoUrl}>
             Apply New Visual
           </Button>
           <Button variant="ghost" className="w-full font-black uppercase italic text-[10px] text-muted-foreground" onClick={() => setIsPhotoDialogOpen(false)}>
             Cancel
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   </div>
 )
}
