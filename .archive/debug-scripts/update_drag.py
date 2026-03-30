import re

with open('src/components/FloatingArenaLink.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure isAnimating is in state
state_replacement = '''
  const [position, setPosition] = useState({ x: 10, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isInDropZone, setIsInDropZone] = useState(false)
  const currentPos = useRef({ x: 10, y: 100 })
'''
text = re.sub(r'  const \[position, setPosition\] = useState\(\{ x: 20, y: 150 \}\)\n  const \[isDragging, setIsDragging\] = useState\(false\)\n  const \[showHint, setShowHint\] = useState\(false\)\n  const \[isInDropZone, setIsInDropZone\] = useState\(false\)', state_replacement, text)

# We use currentPos.current to track the latest drag position without triggering effect teardowns
effect_pattern = re.compile(r'  useEffect\(\(\) => \{.+?(?=  const handleMouseDown)', re.DOTALL)
effect_replacement = '''  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      setIsAnimating(false)

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      const newX = Math.min(Math.max(10, clientX - 28), window.innerWidth - 66)
      const newY = Math.min(Math.max(10, clientY - 28), window.innerHeight - 66)
      
      // Magnetic Drop Zone Check
      const dropZoneY = window.innerHeight - 180
      const dropZoneXStart = (window.innerWidth / 2) - 100
      const dropZoneXEnd = (window.innerWidth / 2) + 100
      
      const inZone = clientY > dropZoneY && clientX > dropZoneXStart && clientX < dropZoneXEnd
      setIsInDropZone(inZone)
      
      if (inZone) {
         currentPos.current = { x: window.innerWidth / 2 - 28, y: window.innerHeight - 150 }
         setPosition(currentPos.current)
      } else {
         currentPos.current = { x: newX, y: newY }
         setPosition(currentPos.current)
      }
    }

    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (isDragging && isInDropZone) {
        handleDisconnect()
      } else if (isDragging && !isInDropZone) {
        setIsAnimating(true)
        const snapX = currentPos.current.x > (window.innerWidth / 2) - 28 ? window.innerWidth - 66 : 10
        const snapY = Math.min(currentPos.current.y, (window.innerHeight / 2) - 60)
        currentPos.current = { x: snapX, y: Math.max(10, snapY) }
        setPosition(currentPos.current)
      }
      setIsDragging(false)
      setIsInDropZone(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMove, { passive: false })
      window.addEventListener('mouseup', handleUp)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging, isInDropZone, activePartyId, party, user, db])

'''
text = effect_pattern.sub(effect_replacement.replace('\\', '\\\\'), text)

wrapper_pattern = re.compile(r'      <div \n        ref=\{dragRef\}\n        className="fixed z-\[9999\] pointer-events-none select-none"\n        style=\{\{ left: position\.x, top: position\.y \}\}\n      >')
wrapper_replacement = '''      <div 
        ref={dragRef}
        className={cn(
          "fixed z-[9999] pointer-events-none select-none",
          isAnimating ? "transition-all duration-300 ease-out" : ""
        )}
        style={{ left: position.x, top: position.y }}
      >'''
text = wrapper_pattern.sub(wrapper_replacement.replace('\\', '\\\\'), text)

with open('src/components/FloatingArenaLink.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Drag Physics Safely Updated!")
