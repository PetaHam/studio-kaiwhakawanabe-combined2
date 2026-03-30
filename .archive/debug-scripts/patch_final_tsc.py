import re

# 1. Fix Heritage Tier in src/app/matchups/page.tsx
with open('src/app/matchups/page.tsx', 'r', encoding='utf-8') as f:
    matchups_text = f.read()

matchups_text = matchups_text.replace(
    "return parseInt(perf.year) < 1994 && perf.tier === 'Heritage';",
    "return parseInt(perf.year) < 1994 && perf.tier === 'Legendary';"
)

with open('src/app/matchups/page.tsx', 'w', encoding='utf-8') as f:
    f.write(matchups_text)

# 2. Fix memberLoading in src/app/performance/[id]/page.tsx
with open('src/app/performance/[id]/page.tsx', 'r', encoding='utf-8') as f:
    perf_text = f.read()

perf_text = perf_text.replace(
    'if (user && partyId && !memberLoading && currentMember === null) {',
    'if (user && partyId && currentMember === null) {'
)
perf_text = perf_text.replace(
    '}, [user, partyId, memberLoading, currentMember, db])',
    '}, [user, partyId, currentMember, db])'
)

with open('src/app/performance/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(perf_text)

# 3. Fix components in src/components/ui/calendar.tsx
with open('src/components/ui/calendar.tsx', 'r', encoding='utf-8') as f:
    cal_text = f.read()

# Delete the entire `components={{ ... }}` block safely using Regex
cal_text = re.sub(
    r'\s+components=\{\{\s+IconLeft: \(\{ \.\.\.props \}: any\) => \(\s+<ChevronLeft className=\{cn\("h-4 w-4", className\)\} \{\.\.\.props\} />\s+\),\s+IconRight: \(\{ \.\.\.props \}: any\) => \(\s+<ChevronRight className=\{cn\("h-4 w-4", className\)\} \{\.\.\.props\} />\s+\),\s+\}\}',
    '',
    cal_text,
    flags=re.DOTALL
)

with open('src/components/ui/calendar.tsx', 'w', encoding='utf-8') as f:
    f.write(cal_text)

print("Final typescript patches applied.")
