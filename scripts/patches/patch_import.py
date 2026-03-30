import re

with open('src/app/performance/legacy-arena/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make absolutely sure useSearchParams is imported from next/navigation
if "useSearchParams" not in text.split("next/navigation")[0]:
    # Replace useRouter with useRouter, useSearchParams
    text = re.sub(
        r'import\s+\{\s*useRouter\s*\}\s+from\s+[\'"]next/navigation[\'"]',
        r"import { useRouter, useSearchParams } from 'next/navigation'",
        text
    )

with open('src/app/performance/legacy-arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Import patched!")
