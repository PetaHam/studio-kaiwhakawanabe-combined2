import re

with open('src/components/Navigation.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Forcefully remove the hide conditions for debugging
text = text.replace(
'''  // Hide navigation entirely if not logged in or during initial loading
  // Also explicitly hide on the login and setup pages to ensure a clean entry
  if (isUserLoading || !user || pathname === '/login') {
    return null;
  }''',
'''  // FORCED RENDER: Show navigation ALWAYS to debug missing UI
  if (pathname === '/login') {
     return null;
  }'''
)

with open('src/components/Navigation.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Navigation bar forced visible")
