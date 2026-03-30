import re

with open("src/app/matchups/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update TIER_COSTS
text = text.replace(
    "'Epic': 5000",
    "'Epic': 5000,\n 'Contender': 1000"
)

# 2. Update TIER_ORDER
text = text.replace(
    "'Epic': 0,",
    "'Contender': -1,\n 'Epic': 0,"
)

# 3. Add Users icon import
if "Users" not in text:
    text = text.replace("import { ChevronLeft", "import { ChevronLeft, Users")

# 4. Extract Card into a render function and split UI
card_jsx = """
  const renderCard = (perf: LegacyPerformance) => {
    const cost = getUnlockCost(perf);
    const isOwned = isUnlocked(perf);
    const isBlurred = perf.tier !== 'Contender';

    return (
      <Card
        key={perf.id}
        className="overflow-hidden border border-slate-200 bg-white relative h-44 group cursor-pointer rounded-[2.5rem] shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
        onClick={() => isOwned ? null : setTeamToUnlock(perf)}
      >
        <Image
          src={perf.image}
          alt={perf.name}
          fill
          className={cn(
            "object-cover transition-all duration-1000",
            !isOwned && "grayscale",
            isBlurred && !isOwned ? "opacity-10 blur-xl" : "opacity-30 group-hover:opacity-50"
          )}
        />
        
        {/* Item Stats HUD Overlay */}
        <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-4 z-20">
           <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mb-3 text-center border-b border-primary/20 pb-1">Roopu Stats</p>
           <div className="grid grid-cols-2 gap-x-4 gap-y-2">
             {Object.entries(perf.itemStats).map(([item, stat]) => (
               <div key={item} className="flex flex-col gap-0.5">
                 <span className="text-[7px] font-black text-slate-400 uppercase leading-none">{item.substring(0, 3)}</span>
                 <div className="flex items-center gap-1.5">
                   <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-primary" style={{ width: `${stat}%` }} />
                   </div>
                   <span className="text-[8px] font-black text-white tabular-nums">{stat}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent p-5 flex flex-col justify-end group-hover:opacity-0 transition-opacity">
          <div className="flex items-center justify-between mb-auto pt-1 relative z-10">
            {perf.tier === 'S-Tier' ? <Crown className="w-5 h-5 text-red-500" /> : ['Ultimate', 'Legendary'].includes(perf.tier) ? <Award className="w-5 h-5 text-yellow-500" /> : <Zap className="w-5 h-5 text-blue-500" />}
            {isOwned && <Badge className="bg-green-100 text-green-600 border-none font-black text-[7px] px-2 h-4">OWNED</Badge>}
          </div>

          <div className="space-y-1 relative z-10 -translate-y-2 text-left">
            <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] block mb-0.5", 
              perf.tier === 'S-Tier' ? "text-red-600" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "text-yellow-600" : perf.tier === 'Elite' ? "text-blue-600" : perf.tier === 'Epic' ? "text-primary/80" : "text-green-600"
            )}>
              {perf.tier}
            </span>
            <h3 className={cn(
              "text-[12px] font-black text-slate-950 italic uppercase leading-tight line-clamp-2 transition-all",
              isBlurred && !isOwned && "blur-sm select-none opacity-20"
            )}>
              {perf.name}
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] block mb-2">YEAR {perf.year}</span>
            {!isOwned && (
              <Badge className={cn(
                "w-full justify-center text-white font-black text-[9px] h-8 rounded-xl shadow-md border-none transition-all",
                perf.tier === 'S-Tier' ? "bg-red-600 animate-pulse border-red-500" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "bg-yellow-600 hover:bg-yellow-700" : perf.tier === 'Elite' ? "bg-blue-600 hover:bg-blue-700" : perf.tier === 'Epic' ? "bg-primary hover:bg-primary/90" : "bg-green-600 hover:bg-green-700"
              )}>
                {cost} SHARDS
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  };
"""

target_vault_section = """        <div className="space-y-4 pt-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2">
            <Lock className="w-5 h-5" /> {search ? 'SEARCH RESULTS' : 'HISTORICAL VAULT'}
          </h2>
          <div className="grid grid-cols-2 gap-4 px-1">
            {(search ? searchResults : lockedPerformances).map((perf) => {
              const cost = getUnlockCost(perf);
              const isOwned = isUnlocked(perf);
              const isBlurred = perf.tier === 'S-Tier';
             
              return (
                <Card
                  key={perf.id}
                  className="overflow-hidden border border-slate-200 bg-white relative h-44 group cursor-pointer rounded-[2.5rem] shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                  onClick={() => isOwned ? null : setTeamToUnlock(perf)}
                >
                  <Image
                    src={perf.image}
                    alt={perf.name}
                    fill
                    className={cn(
                      "object-cover transition-all duration-1000",
                      !isOwned && "grayscale",
                      isBlurred && !isOwned ? "opacity-10 blur-md" : "opacity-30 group-hover:opacity-50"
                    )}
                  />
                  
                  {/* Item Stats HUD Overlay */}
                  <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-4 z-20">
                     <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mb-3 text-center border-b border-primary/20 pb-1">Roopu Stats</p>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                       {Object.entries(perf.itemStats).map(([item, stat]) => (
                         <div key={item} className="flex flex-col gap-0.5">
                           <span className="text-[7px] font-black text-slate-400 uppercase leading-none">{item.substring(0, 3)}</span>
                           <div className="flex items-center gap-1.5">
                             <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-primary" style={{ width: `${stat}%` }} />
                             </div>
                             <span className="text-[8px] font-black text-white tabular-nums">{stat}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent p-5 flex flex-col justify-end group-hover:opacity-0 transition-opacity">
                    <div className="flex items-center justify-between mb-auto pt-1 relative z-10">
                      {perf.tier === 'S-Tier' ? <Crown className="w-5 h-5 text-red-500" /> : ['Ultimate', 'Legendary'].includes(perf.tier) ? <Award className="w-5 h-5 text-yellow-500" /> : <Zap className="w-5 h-5 text-blue-500" />}
                      {isOwned && <Badge className="bg-green-100 text-green-600 border-none font-black text-[7px] px-2 h-4">OWNED</Badge>}
                    </div>

                    <div className="space-y-1 relative z-10 -translate-y-2 text-left">
                      <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] block mb-0.5", 
                        perf.tier === 'S-Tier' ? "text-red-600" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "text-yellow-600" : perf.tier === 'Elite' ? "text-blue-600" : "text-primary/80"
                      )}>
                        {perf.tier}
                      </span>
                      <h3 className={cn(
                        "text-[12px] font-black text-slate-950 italic uppercase leading-tight line-clamp-2 transition-all",
                        isBlurred && !isOwned && "blur-[4px] select-none opacity-40"
                      )}>
                        {perf.name}
                      </h3>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] block mb-2">YEAR {perf.year}</span>
                      {!isOwned && (
                        <Badge className={cn(
                          "w-full justify-center text-white font-black text-[9px] h-8 rounded-xl shadow-md border-none transition-all",
                          perf.tier === 'S-Tier' ? "bg-red-600 animate-pulse border-red-500" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "bg-yellow-600 hover:bg-yellow-700" : perf.tier === 'Elite' ? "bg-blue-600 hover:bg-blue-700" : "bg-primary hover:bg-primary/90"
                        )}>
                          {cost} SHARDS
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>"""

new_vault_section = """        <div className="space-y-4 pt-4">
          {search ? (
            <>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mb-4">
                <Search className="w-5 h-5" /> SEARCH RESULTS
              </h2>
              <div className="grid grid-cols-2 gap-4 px-1">
                 {searchResults.map(perf => renderCard(perf))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-yellow-500" /> CHAMPIONSHIP TIERS
              </h2>
              <div className="grid grid-cols-2 gap-4 px-1">
                 {lockedPerformances.filter(p => p.tier !== 'Contender').map(perf => renderCard(perf))}
              </div>

              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mt-8 mb-4">
                <Users className="w-5 h-5 text-slate-400" /> NATIONAL CONTENDERS
              </h2>
              <div className="grid grid-cols-2 gap-4 px-1">
                 {lockedPerformances.filter(p => p.tier === 'Contender').map(perf => renderCard(perf))}
              </div>
            </>
          )}
        </div>"""

text = text.replace(target_vault_section, card_jsx + "\n" + new_vault_section)

with open("src/app/matchups/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
print("Updated Matchups Layout successfully!")
