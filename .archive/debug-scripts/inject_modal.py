import re

# 1. Update [id]/page.tsx
with open('src/app/performance/[id]/page.tsx', 'r', encoding='utf-8') as f:
    perf_text = f.read()

# Add import
import_str = "import { DelegateJudgeModal } from '@/components/DelegateJudgeModal'\n"
if "DelegateJudgeModal" not in perf_text:
    perf_text = perf_text.replace("import { cn } from '@/lib/utils'", f"import {{ cn }} from '@/lib/utils'\n{import_str}")

# Add component right after <header className="...">
header_regex = r'(<header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md pt-2 border-b rounded-b-\[2\.5rem\] flex flex-col">)'
modal_tag = '\n        <DelegateJudgeModal partyId={partyId} isLeader={activeParty?.leaderId === user?.uid} />'
perf_text = re.sub(header_regex, r'\1' + modal_tag, perf_text)

with open('src/app/performance/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(perf_text)

# 2. Update legacy-arena/page.tsx
with open('src/app/performance/legacy-arena/page.tsx', 'r', encoding='utf-8') as f:
    legacy_text = f.read()

if "DelegateJudgeModal" not in legacy_text:
    legacy_text = legacy_text.replace("import { cn } from '@/lib/utils'", f"import {{ cn }} from '@/lib/utils'\n{import_str}")

legacy_header_regex = r'(<header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b pt-8 pb-4 flex items-center justify-between px-4 rounded-b-\[2\.5rem\]">)'
legacy_modal_tag = '\n        <DelegateJudgeModal partyId={partyId} isLeader={activeParty?.leaderId === user?.uid} />'
legacy_text = re.sub(legacy_header_regex, r'\1' + legacy_modal_tag, legacy_text)

with open('src/app/performance/legacy-arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(legacy_text)

print("Injected Modals!")
