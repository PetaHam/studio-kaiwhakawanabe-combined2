import re

with open('src/app/matchups/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to target the National Contenders Block exactly.
# It starts at:
#              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mb-4">
#                <Users className="w-5 h-5 text-slate-400" /> NATIONAL CONTENDERS
#              </h2>
# and ends right before CHAMPIONSHIP TIERS

pattern = re.compile(
    r'(<h2 className="text-\[10px\] font-black uppercase tracking-\[0\.2em\] text-slate-400 px-3 flex items-center gap-2 mb-4">\s*<Users className="w-5 h-5 text-slate-400" /> NATIONAL CONTENDERS\s*</h2>)(.*?)(<h2 className="text-\[10px\] font-black uppercase tracking-\[0\.2em\] text-slate-400 px-3 flex items-center gap-2 mt-8 mb-4">\s*<Crown className="w-5 h-5 text-yellow-500" /> CHAMPIONSHIP TIERS)',
    re.DOTALL
)

replacement = r'''\1
              <div className="flex flex-col gap-6">
                 {(() => {
                    const contenders = lockedPerformances.filter(p => p.tier === 'Contender');
                    
                    // Group by Year
                    const contendersByYear = contenders.reduce((acc, perf) => {
                       if (!acc[perf.year]) acc[perf.year] = [];
                       acc[perf.year].push(perf);
                       return acc;
                    }, {} as Record<string, typeof contenders>);
                    
                    const years = Object.keys(contendersByYear).sort((a,b) => Number(b) - Number(a));
                    
                    return years.map(year => (
                       <div key={year} className="space-y-3">
                          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 border-b border-slate-100 pb-1 flex justify-between items-center">
                             <span>Te Matatini {year}</span>
                             <span className="text-[8px] text-slate-300">{contendersByYear[year].length} Qualifiers</span>
                          </h3>
                          
                          <div className="flex overflow-x-auto gap-3 px-3 pb-4 snap-x hide-scrollbar">
                             {contendersByYear[year].map(perf => {
                                const cost = getUnlockCost(perf);
                                const isOwned = isUnlocked(perf);
                                
                                return (
                                  <Card
                                    key={perf.id}
                                    className="min-w-[140px] w-[140px] shrink-0 snap-center overflow-hidden border border-slate-200 bg-white relative h-40 group cursor-pointer rounded-[1.5rem] shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                                    onClick={() => isOwned ? null : setTeamToUnlock(perf)}
                                  >
                                    <Image
                                      src={perf.image}
                                      alt={perf.name}
                                      fill
                                      className={cn(
                                        "object-cover transition-all duration-1000",
                                        !isOwned && "grayscale",
                                        "opacity-30 group-hover:opacity-50"
                                      )}
                                    />
                                    
                                    {/* Item Stats HUD Overlay */}
                                    <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-3 z-20">
                                       <p className="text-[7px] font-black uppercase text-green-500 tracking-[0.2em] mb-2 text-center border-b border-green-500/20 pb-1">Stats</p>
                                       <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                         {Object.entries(perf.itemStats).slice(0,6).map(([item, stat]) => (
                                           <div key={item} className="flex flex-col gap-0.5">
                                             <span className="text-[6px] font-black text-slate-400 uppercase leading-none">{item.substring(0, 3)}</span>
                                             <div className="flex items-center gap-1">
                                               <div className="h-0.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                 <div className="h-full bg-green-500" style={{ width: `${stat}%` }} />
                                               </div>
                                               <span className="text-[7px] font-black text-white tabular-nums">{stat}</span>
                                             </div>
                                           </div>
                                         ))}
                                       </div>
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent p-3 flex flex-col justify-end group-hover:opacity-0 transition-opacity">
                                      <div className="flex items-center justify-between mb-auto relative z-10 -mt-1">
                                        <Users className="w-4 h-4 text-green-500" />
                                        {isOwned && <Badge className="bg-green-100 text-green-600 border-none font-black text-[6px] px-1.5 h-3">OWNED</Badge>}
                                      </div>

                                      <div className="space-y-1 relative z-10 -translate-y-1 text-left">
                                        <h3 className="text-[10px] font-black text-slate-950 italic uppercase leading-tight line-clamp-2">
                                          {perf.name}
                                        </h3>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.1em] block mb-1.5 line-clamp-1">{perf.location}</span>
                                        {!isOwned && (
                                          <Badge className="w-full justify-center text-white font-black text-[8px] h-6 rounded-lg shadow-sm border-none transition-all bg-green-600 hover:bg-green-700">
                                            {cost} SHARDS
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                )
                             })}
                          </div>
                       </div>
                    ))
                 })()}
              </div>

              \3'''

new_text = pattern.sub(replacement, text)

# Add hide-scrollbar utility block if not present
if "hide-scrollbar" not in new_text:
    print("Warning: you will need to add raw CSS for hide-scrollbar or use tailwind scrollbar plugins.")

with open('src/app/matchups/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Contenders layout restructured successfully!")
