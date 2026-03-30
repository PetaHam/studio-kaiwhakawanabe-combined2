import re

with open('src/app/performance/legacy-arena/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add Suspense import if not exists
if "import { Suspense" not in text:
    if "import React" in text:
        text = re.sub(r'import React([^\{]*)\{([^\}]*)\}(\s*from\s+[\'"]react[\'"])', r'import React\1{ Suspense, \2}\3', text)
    else:
        text = "import { Suspense } from 'react'\n" + text

# Rename component
text = text.replace('export default function LegacyArenaPage() {', 'function LegacyArenaContent() {')

# Add export default wrapper at the bottom
wrapper = '''
export default function LegacyArenaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center animate-pulse"><div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <LegacyArenaContent />
    </Suspense>
  )
}
'''
if "export default function LegacyArenaPage" not in text:
    text += wrapper

with open('src/app/performance/legacy-arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Suspense boundary fixed!")
