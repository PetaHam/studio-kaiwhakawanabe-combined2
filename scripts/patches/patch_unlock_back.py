import re

with open('src/components/UnlockReveal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure ChevronLeft is imported
if 'ChevronLeft' not in text:
    text = text.replace('import { Crown,', 'import { Crown, ChevronLeft,')

# Inject the Top-Left Back button
back_button_html = r'''
      {/* Particle/Sparkle Layer */}
      <div className="absolute top-6 left-6 z-[250]">
        <Button onClick={onClose} variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full px-4 h-12 font-black tracking-widest text-[10px] uppercase">
          <ChevronLeft className="w-5 h-5 mr-1" /> BACK TO VAULT
        </Button>
      </div>
'''

text = text.replace('      {/* Particle/Sparkle Layer */}', back_button_html)

with open('src/components/UnlockReveal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Back to Vault button deployed to Unlock Reveal.")
