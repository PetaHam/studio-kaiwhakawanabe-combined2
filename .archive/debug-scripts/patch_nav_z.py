import re

with open('src/components/Navigation.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Force z-[999999] on both the Navigation bar and the Clock Bar
text = text.replace(
    '<div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">',
    '<div className="fixed top-0 left-0 right-0 z-[999999] flex justify-center pointer-events-none">'
)

text = text.replace(
    '<nav className="fixed bottom-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-2xl border-t border-white/10 px-2 py-3',
    '<nav className="fixed bottom-0 left-0 right-0 z-[999999] bg-black/90 backdrop-blur-2xl border-t border-white/10 px-2 py-3'
)

with open('src/components/Navigation.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Navigation click-interception patched with terminal z-index.")
