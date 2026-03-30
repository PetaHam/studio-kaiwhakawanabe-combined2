import re

with open('src/app/matchups/arena/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. REMOVE RHYTHM STATE AND INJECT NEW AUTOMATED STATE
state_replacements = r'''  const [battleState, setBattleState] = useState<'intro' | 'matchmaking' | 'roulette' | 'countdown' | 'clash' | 'finished'>('intro')
  const [rouletteIndex, setRouletteIndex] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedItem, setSelectedItem] = useState<KapaHakaItem | null>(null)
  
  const [playerScore, setPlayerScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [playerRoll, setPlayerRoll] = useState(0)
  const [opponentRoll, setOpponentRoll] = useState(0)
  const [showResults, setShowResults] = useState(false)
  
  const [countdown, setCountdown] = useState(3)
  const [isProcessing, setIsProcessing] = useState(false)

  const playerBracket = useMemo(() => profile?.currentDraft as Record<KapaHakaItem, string>, [profile])'''

text = re.sub(
    r'const \[battleState.*const playerBracket = useMemo\(\(\) => profile\?\.currentDraft as Record<KapaHakaItem, string>, \[profile\]\)',
    state_replacements,
    text,
    flags=re.DOTALL
)

# 2. MATCHMAKING LOGIC: Update handleScoutOpponent to handle Random
scout_replacements = r'''  const handleScoutOpponent = async () => {
    if (!opponentIdInput.trim() || isScouting) return;
    setIsScouting(true);
    try {
      const q = query(collection(db, 'users'), where('shortId', '==', opponentIdInput.trim().toUpperCase()), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast({ title: "Opponent Not Found", variant: "destructive" });
      } else {
        const data = snapshot.docs[0].data();
        if (data.id === user?.uid) {
          toast({ title: "Self-Clash Error", variant: "destructive" });
        } else if (!data.currentDraft) {
          toast({ title: "Draft Incomplete", variant: "destructive" });
        } else {
          setOpponentProfile(data);
          toast({ title: "Opponent Scouted!" });
        }
      }
    } catch (e) { console.error(e); } finally { setIsScouting(false); }
  }

  const handleRandomOpponent = async () => {
    if (isScouting) return;
    setIsScouting(true);
    try {
      const q = query(collection(db, 'users'), where('roopuName', '!=', ''), limit(15));
      const snapshot = await getDocs(q);
      const validDocs = snapshot.docs.filter(d => d.data().id !== user?.uid && d.data().currentDraft);
      if (validDocs.length === 0) {
        toast({ title: "No Opponents found", description: "Try again later.", variant: "destructive" });
      } else {
        const randomDoc = validDocs[Math.floor(Math.random() * validDocs.length)].data();
        setOpponentProfile(randomDoc);
        setOpponentIdInput(randomDoc.shortId || "RAN-DOM");
        toast({ title: "Random Opponent Found!" });
      }
    } catch(e) { console.error(e); } finally { setIsScouting(false); }
  }'''

text = re.sub(
    r'const handleScoutOpponent = async \(\) => \{.+?catch \(e\) \{ console\.error\(e\); \} finally \{ setIsScouting\(false\); \}\s+\}',
    scout_replacements,
    text,
    flags=re.DOTALL
)

# 3. USEEFFECT GAME LOOP
game_loop_replacements = r'''  useEffect(() => {
    if (battleState === 'clash' && selectedItem) {
      if (isHeritagePerf) {
        toast({ title: "MANA AUTHORITY DETECTED", description: "Automatic Victory.", duration: 3000 });
        setPlayerScore(100);
        setOpponentScore(0);
        setShowResults(true);
        setTimeout(() => setBattleState('finished'), 2500);
        return;
      }

      // Calculate initial variance rolls
      const pRoll = Math.floor(Math.random() * 11) - 5;
      const oRoll = Math.floor(Math.random() * 11) - 5;
      
      setPlayerRoll(pRoll);
      setOpponentRoll(oRoll);

      const pFinal = Math.max(0, Math.min(100, playerItemProficiency + pRoll));
      const oFinal = Math.max(0, Math.min(100, opponentItemProficiency + oRoll));
      
      // Dramatic delay before showing final smash scores
      const resultTimer = setTimeout(() => {
        setPlayerScore(pFinal);
        setOpponentScore(oFinal);
        setShowResults(true);
        
        // Wait on the final screen before advancing to finished state
        setTimeout(() => {
          setBattleState('finished');
        }, 3500);

      }, 2500);

      return () => clearTimeout(resultTimer);
    }
  }, [battleState, selectedItem, isHeritagePerf, playerItemProficiency, opponentItemProficiency]);

  useEffect(() => {
     if (battleState === 'finished' && !isProcessing) {
        setIsProcessing(true);
        // Only award shards once per match
        if (playerScore > opponentScore && user) {
           updateDocumentNonBlocking(doc(db, 'users', user.uid), {
               criticPoints: increment(50)
           });
           toast({ title: "VICTORY!", description: "+50 Mana Shards Acquired" });
        }
     }
  }, [battleState, playerScore, opponentScore, user, db, isProcessing]);

  const myJudgeID = profile?.shortId || user?.uid.slice(0, 6).toUpperCase();'''

text = re.sub(
    r'useEffect\(\(\) => \{\s+if \(battleState === \'clash\' && selectedItem\) \{.+?const myJudgeID = profile\?\.shortId \|\| user\?\.uid\.slice\(0, 6\)\.toUpperCase\(\);',
    game_loop_replacements,
    text,
    flags=re.DOTALL
)

# 4. FIX intro and Clash UIs
text = text.replace(
    '''<Button className="w-full h-20 text-xl font-black uppercase italic rounded-[2rem]" onClick={() => setBattleState('matchmaking')}>FIND OPPONENT</Button>''',
    '''<Button className="w-full h-20 text-xl font-black uppercase italic rounded-[2rem] bg-slate-950 text-white" onClick={() => setBattleState('matchmaking')}>FIND OPPONENT</Button>\n            <Button variant="outline" className="w-full h-16 text-lg border-2 font-black uppercase italic rounded-2xl" onClick={async () => { await handleRandomOpponent(); if (!isScouting) setBattleState('matchmaking'); }}>BATTLE RANDOM SQUAD</Button>'''
)

clash_ui_old = r'''        {battleState === 'clash' && (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex justify-between items-center px-2 gap-2">
               <PerformanceVideoPanel src={playerPerf?.videoUrl} intensity={stagePresence / 100} isManaSurge={isManaSurgeActive} />
               <div className="p-3 rounded-full bg-white shadow-xl"><Swords className="w-6 h-6 text-primary animate-pulse" /></div>
               <PerformanceVideoPanel src={opponentPerf?.videoUrl} intensity={(100 - stagePresence) / 100} isOpponent />
            </div>
            <div className="flex justify-between px-4">
              <div className="text-3xl font-black italic tabular-nums">{Math.floor(stagePresence)}%</div>
              <div className="text-3xl font-black italic text-primary tabular-nums">{clashTimer.toFixed(1)}s</div>
            </div>
            <div className="h-8 w-full bg-slate-100 rounded-full overflow-hidden border relative">
               <div className={cn("absolute h-full transition-all duration-100", stagePresence > 50 ? "bg-primary right-1/2" : "bg-red-500 left-1/2")} style={{ width: `${Math.abs(stagePresence - 50)}%` }} />
               <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 -translate-x-1/2" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className={cn("w-44 h-44 rounded-full border-4 border-dashed flex flex-col items-center justify-center transition-all", isHeritagePerf ? "border-red-500 bg-red-50" : pulseState === 'GO' ? "border-green-500 bg-green-50" : "border-slate-200")}>
                {isHeritagePerf ? <Crown className="w-12 h-12 text-red-500 animate-bounce" /> : <MousePointer2 className={cn("w-12 h-12", pulseState === 'GO' ? "text-green-500" : "text-slate-300")} />}
                <h2 className={cn("text-3xl font-black italic uppercase", isHeritagePerf ? "text-red-600" : pulseState === 'GO' ? "text-green-500" : "text-slate-300")}>{isHeritagePerf ? 'AUTHORITY' : pulseState}</h2>
              </div>
            </div>
            <div className="h-16 flex items-center justify-center">
              {isManaSurgeAvailable && !isHeritagePerf && <Button onClick={(e) => { e.stopPropagation(); setIsManaSurgeAvailable(false); setIsManaSurgeActive(true); setTimeout(() => setIsManaSurgeActive(false), 3000); }} className="h-12 px-10 rounded-full bg-primary text-white font-black uppercase">MANA SURGE</Button>}
            </div>
          </div>
        )}'''

clash_ui_new = r'''        {battleState === 'clash' && (
          <div className="flex-1 flex flex-col space-y-4 relative">
            <h2 className="text-center font-black italic text-primary uppercase text-2xl animate-pulse tracking-widest">{selectedItem} Clash</h2>
            
            <div className="flex justify-between items-center px-2 gap-2 mt-4">
               <div className="flex flex-col items-center gap-2">
                 <PerformanceVideoPanel src={playerPerf?.videoUrl} intensity={0.8} />
                 <p className="text-[10px] font-black uppercase max-w-[120px] text-center">{playerPerf?.name || "Your Squad"}</p>
                 <Badge className="bg-primary">{playerItemProficiency} BASE</Badge>
               </div>
               
               <div className="p-3 rounded-full bg-slate-900 border-2 border-primary/50 shadow-xl z-20">
                 <Swords className="w-6 h-6 text-primary animate-bounce shadow-primary drop-shadow-[0_0_10px_rgba(255,69,0,0.8)]" />
               </div>
               
               <div className="flex flex-col items-center gap-2">
                 <PerformanceVideoPanel src={opponentPerf?.videoUrl} intensity={0.8} isOpponent />
                 <p className="text-[10px] font-black uppercase max-w-[120px] text-center">{opponentPerf?.name || "Rival Squad"}</p>
                 <Badge variant="outline">{opponentItemProficiency} BASE</Badge>
               </div>
            </div>

            <div className="flex justify-between px-6 mt-8">
              <div className="text-center space-y-1 animate-in slide-in-from-bottom-4 duration-700">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">RNG ROLL</p>
                 <p className={cn("text-5xl font-black italic", playerRoll >= 0 ? "text-green-500" : "text-red-500 max-w-[80px]")}>
                    {playerRoll > 0 ? `+${playerRoll}` : playerRoll}
                 </p>
              </div>
              <div className="text-center space-y-1 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">RNG ROLL</p>
                 <p className={cn("text-5xl font-black italic", opponentRoll >= 0 ? "text-green-500" : "text-red-500 max-w-[80px]")}>
                    {opponentRoll > 0 ? `+${opponentRoll}` : opponentRoll}
                 </p>
              </div>
            </div>
            
            {showResults && (
              <div className="absolute inset-0 -m-8 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center justify-center space-y-6 w-full px-6">
                   <p className="text-sm font-black uppercase tracking-[0.5em] text-primary animate-pulse">Final Verdict</p>
                   <div className="flex items-center justify-between w-full">
                     <div className="text-center">
                       <p className="text-7xl font-black italic text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]">{playerScore}</p>
                     </div>
                     <Swords className="w-12 h-12 text-slate-600 scale-150 rotate-12" />
                     <div className="text-center">
                       <p className="text-7xl font-black italic text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">{opponentScore}</p>
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}'''

text = re.sub(
    r'\{battleState === \'clash\' && \(\s+<div className="flex-1 flex flex-col space-y-4">.+?</div>\s+\)\}',
    clash_ui_new,
    text,
    flags=re.DOTALL
)

with open('src/app/matchups/arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Automated Matchmaking and PVP Stat Resolver successfully integrated!")
