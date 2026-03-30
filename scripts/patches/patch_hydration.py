import re

with open('src/components/Navigation.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add mounted state
mount_state_old = r'''  const { user, isUserLoading } = useUser()
  const [stationTime, setStationTime] = useState('')'''

mount_state_new = r'''  const { user, isUserLoading } = useUser()
  const [stationTime, setStationTime] = useState('')
  const [mounted, setMounted] = useState(false)'''

text = text.replace(mount_state_old, mount_state_new)

# Force return null if not mounted
render_old = r'''  // FORCED RENDER: Show navigation ALWAYS to debug missing UI
  if (pathname === '/login') {
     return null;
  }'''

render_new = r'''  // Initialize mounted state to avoid SSR hydration crash
  useEffect(() => setMounted(true), []);

  // FORCED RENDER: Show navigation ALWAYS to debug missing UI
  if (pathname === '/login' || !mounted) {
     return null;
  }'''

text = text.replace(render_old, render_new)

with open('src/components/Navigation.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Hydration bypass patched.")
