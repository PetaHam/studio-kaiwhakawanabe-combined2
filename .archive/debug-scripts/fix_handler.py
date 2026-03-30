import re

with open('src/app/matchups/arena/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove onClick={handleTap}
text = text.replace(' onClick={handleTap}', '')

with open('src/app/matchups/arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Orphaned handler removed.")
