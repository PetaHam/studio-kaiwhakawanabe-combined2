import re

with open('src/components/ui/calendar.tsx', 'r', encoding='utf-8') as f:
    cal_text = f.read()

# Fix IconLeft and IconRight in Shadcn calendar
cal_text = cal_text.replace(
    'IconLeft: ({ className, ...props }) => (',
    'IconLeft: ({ ...props }: any) => ('
)
cal_text = cal_text.replace(
    'IconRight: ({ className, ...props }) => (',
    'IconRight: ({ ...props }: any) => ('
)

with open('src/components/ui/calendar.tsx', 'w', encoding='utf-8') as f:
    f.write(cal_text)

print("Calendar TS issues patched.")
