import re

# 1. Update Navigation.tsx
with open('src/components/Navigation.tsx', 'r', encoding='utf-8') as f:
    nav_text = f.read()

nav_text = nav_text.replace(
    "if (isUserLoading || !user || pathname === '/login' || pathname === '/setup') {",
    "if (isUserLoading || !user || pathname === '/login') {"
)

with open('src/components/Navigation.tsx', 'w', encoding='utf-8') as f:
    f.write(nav_text)

# 2. Update login/page.tsx
with open('src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    login_text = f.read()

login_text = login_text.replace(
    "const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/'",
    "const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')"
)
login_text = login_text.replace(
    "router.push(returnUrl)",
    "router.push(returnUrl ? returnUrl : '/setup')"
)

with open('src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(login_text)

# 3. Update setup/page.tsx
with open('src/app/setup/page.tsx', 'r', encoding='utf-8') as f:
    setup_text = f.read()

# Add History, MessageSquare, Users, Sparkles  imports if missing
if "Sparkles" not in setup_text:
    setup_text = setup_text.replace(
        "import { Check, Heart, Palette, User, ArrowRight, UserCircle, ShieldCheck } from 'lucide-react'",
        "import { Check, Heart, Palette, User, ArrowRight, UserCircle, ShieldCheck, Sparkles, History, MessageSquare, Users } from 'lucide-react'"
    )

# Increase Steps visual array
setup_text = setup_text.replace("[1, 2].map((s) => (", "[1, 2, 3].map((s) => (")

# Change Step 2 "Complete" button to advance step instead
setup_btn_old = r'''            <Button className="w-full h-14 bg-slate-950 hover:bg-slate-900 text-white shadow-xl group border-2 border-transparent font-black uppercase tracking-wider rounded-2xl" onClick={handleComplete} disabled={isCompleting || !displayName.trim()}>
              <ShieldCheck className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform text-blue-400" /> SECURE IDENTITY
            </Button>'''

setup_btn_new = r'''            <Button className="w-full h-14 bg-slate-950 hover:bg-slate-900 text-white shadow-xl group border-2 border-transparent font-black uppercase tracking-wider rounded-2xl text-[11px]" onClick={() => setStep(3)} disabled={!displayName.trim()}>
              CONTINUE TO TRAINING <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>'''

setup_text = setup_text.replace(setup_btn_old, setup_btn_new)

# Append Step 3
step_3_ui = r'''      {step === 3 && (
        <Card className="w-full border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right-8 duration-500 rounded-[2.5rem] overflow-hidden flex flex-col mb-24">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader className="py-6 px-8 text-center space-y-2">
            <CardTitle className="uppercase italic text-2xl font-black text-slate-950 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" /> Training Camp
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest leading-relaxed">
              Your 3-step technical briefing as a new judge.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><History className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-[11px] font-black uppercase italic text-slate-950 leading-tight">1. The Vault</h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mt-1">Access absolute archives of performances dating back to 2002.</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><MessageSquare className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-[11px] font-black uppercase italic text-slate-950 leading-tight">2. Live Lobbies</h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mt-1">Join synced party chats to distribute scores against real-time streams.</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Users className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-[11px] font-black uppercase italic text-slate-950 leading-tight">3. Regional Alliances</h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mt-1">Color your interface. Represent your Rohe. Top the leaderboards.</p>
                </div>
              </div>
            </div>
            <Button className="w-full h-14 mt-4 bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(255,69,0,0.3)] group border-2 border-white font-black uppercase italic tracking-widest rounded-[1.5rem] text-[12px]" onClick={handleComplete} disabled={isCompleting}>
              <UserCircle className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" /> START JUDGING
            </Button>
          </CardContent>
        </Card>
      )}
'''

# Find the insertion point (before final closing tags)
if "{step === 3" not in setup_text:
    setup_text = setup_text.replace("    </div>\n  )\n}\n", step_3_ui + "    </div>\n  )\n}\n")

with open('src/app/setup/page.tsx', 'w', encoding='utf-8') as f:
    f.write(setup_text)

print("Onboarding integration complete!")
