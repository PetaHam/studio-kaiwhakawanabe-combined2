import re

with open('src/components/ui/toast.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Shadcn ToastViewport usually requires pointer-events-none, as individual Toasts have pointer-events-auto
text = text.replace(
    '"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",',
    '"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] pointer-events-none",'
)

with open('src/components/ui/toast.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Toast shielding patched.")
