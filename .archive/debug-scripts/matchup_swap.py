import re

with open("src/app/matchups/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Flip order back to Ascending
text = text.replace(
    "TIER_ORDER[b.tier as keyof typeof TIER_ORDER] - TIER_ORDER[a.tier as keyof typeof TIER_ORDER]",
    "TIER_ORDER[a.tier as keyof typeof TIER_ORDER] - TIER_ORDER[b.tier as keyof typeof TIER_ORDER]"
)

# 2. Swap the Championship grid and National Contenders grid
# Find the exact split point between the two grids:
# It's at:
#                  })}
#               </div>
#
#               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mt-8 mb-4">
#                 <Users className="w-5 h-5 text-slate-400" /> NATIONAL CONTENDERS

# Let's use regex to split the text into three parts: Before, Champions, Contenders, After
pattern = re.compile(
    r'(<h2 className="text-\[10px\] font-black uppercase tracking-\[0\.2em\] text-slate-400 px-3 flex items-center gap-2 mb-4">\s*<Crown className="w-5 h-5 text-yellow-500" /> CHAMPIONSHIP TIERS\s*</h2>\s*<div className="grid grid-cols-2 gap-4 px-1">\s*\{lockedPerformances\.filter\(p => p\.tier !== \'Contender\'\)\.map\(\(perf\) => \{.*?</Card>\s*\)\s*\}\)\}\s*</div>)\s*(<h2 className="text-\[10px\] font-black uppercase tracking-\[0\.2em\] text-slate-400 px-3 flex items-center gap-2 mt-8 mb-4">\s*<Users className="w-5 h-5 text-slate-400" /> NATIONAL CONTENDERS\s*</h2>\s*<div className="grid grid-cols-2 gap-4 px-1">\s*\{lockedPerformances\.filter\(p => p\.tier === \'Contender\'\)\.map\(\(perf\) => \{.*?</Card>\s*\)\s*\}\)\}\s*</div>)',
    re.DOTALL
)

match = pattern.search(text)
if match:
    champs = match.group(1)
    contenders = match.group(2)
    
    # We want Contenders, but we need to adjust the mt-8 (margin-top-8) margin.
    # Contenders originally had mt-8. We should move that mt-8 to Champions.
    
    new_contenders = contenders.replace(' mt-8 mb-4', ' mb-4')
    new_champs = champs.replace(' mb-4', ' mt-8 mb-4')
    
    new_content = new_contenders + "\n\n" + new_champs
    text = text[:match.start()] + new_content + text[match.end():]
    print("Grids successfully swapped!")
else:
    print("WARNING: Could not match grids for layout swap.")

with open("src/app/matchups/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
