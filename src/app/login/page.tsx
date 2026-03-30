
"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/firebase'
import { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { toast } from '@/hooks/use-toast'
import { LogIn, Mail, UserCircle, Sparkles, Smartphone, Copy, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
 const router = useRouter()
 const auth = useAuth()
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [isSignUp, setIsSignUp] = useState(false)
 const [isLoading, setIsLoading] = useState(false)

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast({ title: "Details Required", variant: "destructive" })
      return
    }
    setIsLoading(true)
    
    try {
      if (isSignUp) {
        toast({ title: "Creating Account..." })
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        toast({ title: "Signing In..." })
        await signInWithEmailAndPassword(auth, email, password)
      }
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
      router.push(returnUrl ? returnUrl : '/setup')
    } catch (error: any) {
      setIsLoading(false)
      
      let message = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        message = "Incorrect email or password. Please try again.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "An account with this email already exists.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password should be at least 6 characters.";
      }
      
      toast({ title: "Login Failed", description: message, variant: "destructive" })
    }
  }

  const handleGuestLogin = async () => {
    setIsLoading(true)
    try {
      toast({ title: "Guest Access..." })
      await signInAnonymously(auth)
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
      router.push(returnUrl ? returnUrl : '/setup')
    } catch (error: any) {
      setIsLoading(false)
      toast({ title: "Access Failed", description: error.message, variant: "destructive" })
    }
  }

 const handleCopyAppLink = () => {
   if (typeof window !== 'undefined') {
     navigator.clipboard.writeText(window.location.href);
     toast({ title: "App Link Copied!" });
   }
 }

 return (
   <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-16 space-y-6">
     <div className="flex flex-col items-center gap-4">
       <div className="bg-primary/10 p-6 rounded-full animate-mana-pulse">
         <ShieldCheck className="w-16 h-16 text-primary" />
       </div>
       <div className="text-center space-y-1">
         <h1 className="text-3xl font-black uppercase italic tracking-tighter text-primary drop-shadow-md">Kaiwhakawānabe</h1>
         <p className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground">The Couch Judge App</p>
       </div>
     </div>

     <Card className="w-full max-w-sm border-2 bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
       <div className="h-1.5 bg-primary w-full" />
       <CardHeader className="text-center py-6">
         <CardTitle className="uppercase italic font-black text-2xl">{isSignUp ? "Create Account" : "Login"}</CardTitle>
       </CardHeader>
       <CardContent className="space-y-4 pb-8 px-8">
         <div className="space-y-4">
           <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</Label>
             <Input type="email" name="email" autoComplete="username" placeholder="name@roopu.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl bg-secondary border-none" />
           </div>
           <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</Label>
             <Input type="password" name="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl bg-secondary border-none" />
           </div>
         </div>
         <Button className="w-full h-12 text-sm font-black uppercase italic rounded-xl shadow-xl" onClick={handleEmailAuth} disabled={isLoading}>{isSignUp ? "CREATE ACCOUNT" : "SIGN IN NOW"}</Button>
         <div className="flex items-center gap-3 py-1"><div className="h-px bg-slate-100 flex-1" /><span className="text-[8px] font-black text-muted-foreground">OR</span><div className="h-px bg-slate-100 flex-1" /></div>
         <Button variant="outline" className="w-full h-11 rounded-xl border-2 bg-secondary text-primary font-black uppercase italic text-[11px]" onClick={handleGuestLogin} disabled={isLoading}><UserCircle className="w-4 h-4 mr-2" /> CONTINUE AS GUEST</Button>
         <button className="w-full text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors" onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? "Already a judge? Sign In" : "Don't have an account? Sign Up"}</button>
       </CardContent>
     </Card>

     <Card className="w-full max-w-sm border-none bg-primary/5 p-6 rounded-3xl">
       <div className="flex items-start gap-4">
         <div className="p-2 rounded-full bg-primary/10 text-primary mt-1"><Smartphone className="w-4 h-4" /></div>
         <div className="space-y-2 flex-1">
           <div className="flex items-center justify-between">
             <p className="text-[10px] font-black uppercase tracking-widest">Multi-Account Testing</p>
             <Button variant="ghost" size="sm" onClick={handleCopyAppLink} className="h-6 px-2 text-[8px] font-black uppercase bg-primary/10 text-primary rounded-full">COPY LINK</Button>
           </div>
           <div className="space-y-2">
             <p className="text-[9px] font-medium leading-relaxed text-slate-500">To test PVP, open a <b>New Chrome Profile</b> or a <b>different browser</b> (Safari/Firefox).</p>
             <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
               <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
               <p className="text-[8px] font-bold text-red-600 uppercase leading-tight">Avoid Incognito: Cloud security will block access (401 Error).</p>
             </div>
           </div>
         </div>
       </div>
     </Card>
   </div>
 )
}
