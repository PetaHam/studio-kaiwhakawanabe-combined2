import re

# 1. Update page.tsx
with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    page_text = f.read()

# Replace the Link href on the Chat Party card
page_text = page_text.replace(
    '<Link href={user?.isAnonymous ? "/login" : "/performance/legacy-arena"}>',
    '<Link href={user?.isAnonymous ? "/login" : "/performance/legacy-arena?action=create"}>'
)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(page_text)

# 2. Update legacy-arena/page.tsx
with open('src/app/performance/legacy-arena/page.tsx', 'r', encoding='utf-8') as f:
    legacy_text = f.read()

# Add searchParams
if "const searchParams = useSearchParams()" not in legacy_text:
    legacy_text = legacy_text.replace(
        "  const router = useRouter()",
        "  const router = useRouter()\n  const searchParams = useSearchParams()"
    )
    # Ensure useSearchParams is imported
    if "useSearchParams" not in legacy_text:
        legacy_text = legacy_text.replace(
            "import { useRouter } from 'next/navigation'",
            "import { useRouter, useSearchParams } from 'next/navigation'"
        )

# Add isDialogOpen state
if "const [isDialogOpen, setIsDialogOpen]" not in legacy_text:
    legacy_text = legacy_text.replace(
        "  const [newPartyName, setNewPartyName] = useState('')",
        "  const [newPartyName, setNewPartyName] = useState('')\n  const [isDialogOpen, setIsDialogOpen] = useState(() => searchParams?.get('action') === 'create')"
    )

# Safely wrap Dialog component with state control if not already
dialog_pattern = r'<Dialog><DialogTrigger asChild><Button([^>]+)>CREATE HOST LOBBY</Button></DialogTrigger>'
dialog_replacement = r'<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button\1>CREATE HOST LOBBY</Button></DialogTrigger>'
legacy_text = re.sub(dialog_pattern, dialog_replacement, legacy_text)

with open('src/app/performance/legacy-arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(legacy_text)

print("Chat Party Link Route and Auto-Open configured!")
