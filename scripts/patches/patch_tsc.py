import re

# 1. Fix HERITAGE_COST in src/app/matchups/page.tsx
with open('src/app/matchups/page.tsx', 'r', encoding='utf-8') as f:
    matchups_text = f.read()

matchups_text = matchups_text.replace(
    'if (isHeritageTeam(perf)) return HERITAGE_COST;',
    'if (isHeritageTeam(perf)) return 75000;'
)

with open('src/app/matchups/page.tsx', 'w', encoding='utf-8') as f:
    f.write(matchups_text)


# 2. Fix loading destructure in src/app/performance/[id]/page.tsx
with open('src/app/performance/[id]/page.tsx', 'r', encoding='utf-8') as f:
    perf_text = f.read()

perf_text = perf_text.replace(
    'const { data: currentMember, loading: memberLoading } = useDoc(currentMemberRef)',
    'const { data: currentMember } = useDoc(currentMemberRef)'
)

with open('src/app/performance/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(perf_text)


# 3. Fix activeParties null checks in src/app/performance/legacy-arena/page.tsx
with open('src/app/performance/legacy-arena/page.tsx', 'r', encoding='utf-8') as f:
    arena_text = f.read()

arena_text = arena_text.replace(
    '{activeParties?.length > 0 && (',
    '{(activeParties?.length ?? 0) > 0 && ('
)
arena_text = arena_text.replace(
    '{activeParties.map(p => (',
    '{(activeParties || []).map(p => ('
)

with open('src/app/performance/legacy-arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(arena_text)

print("TypeScript type fatalities patched.")
