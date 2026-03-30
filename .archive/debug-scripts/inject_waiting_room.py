import re

# -------------
# 1. Update legacy-arena/page.tsx
# -------------
with open('src/app/performance/legacy-arena/page.tsx', 'r', encoding='utf-8') as f:
    legacy_text = f.read()

# Replace handleJoinParty
old_handle_join = r'''  const handleJoinParty = \(id: string\) => \{
    if \(!user\) \{ router\.push\('/login'\); return; \}
    const memberRef = doc\(db, 'parties', id, 'members', user\.uid\)
    setDocumentNonBlocking\(memberRef, \{ userId: user\.uid, userName: user\.displayName \|\| 'Judge', userColor: getRandomColor\(user\.uid\), isTyping: false, joinedAt: serverTimestamp\(\) \}, \{ merge: true \}\)
    updateDocumentNonBlocking\(doc\(db, 'users', user\.uid\), \{ activePartyId: id, updatedAt: serverTimestamp\(\) \}\)
    setPartyId\(id\)
  \}'''

new_handle_join = r'''  const handleJoinParty = (id: string, isCreator: boolean = false) => {
    if (!user) { router.push('/login'); return; }
    const memberRef = doc(db, 'parties', id, 'members', user.uid)
    setDocumentNonBlocking(memberRef, { 
      userId: user.uid, 
      userName: user.displayName || 'Judge', 
      userColor: getRandomColor(user.uid), 
      isTyping: false, 
      joinedAt: serverTimestamp(),
      status: isCreator ? 'approved' : 'pending',
      assignedItems: isCreator ? ADJUDICATION_ITEMS.map(c => c.id) : []
    }, { merge: true })
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { activePartyId: id, updatedAt: serverTimestamp() })
    setPartyId(id)
  }'''

legacy_text = re.sub(old_handle_join, new_handle_join, legacy_text)

# Replace handleCreateParty
old_handle_create = r'''  const handleCreateParty = \(\) => \{
    if \(!user \|\| user\.isAnonymous\) \{ toast\(\{ title: "Registration Required" \}\); router\.push\('/login'\); return; \}
    if \(!newPartyName\) return
    const newId = `chat_$\{Date\.now\(\)\}`
    setDocumentNonBlocking\(doc\(db, 'parties', newId\), \{ id: newId, name: newPartyName, leaderId: user\.uid, performanceId: 'legacy_arena', status: 'live', createdAt: serverTimestamp\(\) \}, \{ merge: false \}\)
    handleJoinParty\(newId\)
  \}'''

new_handle_create = r'''  const handleCreateParty = () => {
    if (!user || user.isAnonymous) { toast({ title: "Registration Required" }); router.push('/login'); return; }
    if (!newPartyName) return
    const newId = `chat_${Date.now()}`
    setDocumentNonBlocking(doc(db, 'parties', newId), { id: newId, name: newPartyName, leaderId: user.uid, performanceId: 'legacy_arena', status: 'live', createdAt: serverTimestamp() }, { merge: false })
    handleJoinParty(newId, true)
  }'''

legacy_text = re.sub(old_handle_create, new_handle_create, legacy_text)

# Inject currentMember listener and waiting room
member_listener = r'''  const { data: partyMessages } = useCollection(partyMessagesQuery)

  const currentMemberRef = useMemoFirebase(() => (partyId && user) ? doc(db, 'parties', partyId, 'members', user.uid) : null, [db, partyId, user])
  const { data: currentMember } = useDoc(currentMemberRef)

  const activePartyRef = useMemoFirebase(() => partyId ? doc(db, 'parties', partyId) : null, [db, partyId])
  const { data: activeParty } = useDoc(activePartyRef)
'''
legacy_text = re.sub(r'  const \{ data: partyMessages \} = useCollection\(partyMessagesQuery\)', member_listener, legacy_text)

waiting_room_ui = r'''      {!partyId ? ('''
new_waiting_room_ui = r'''      {partyId && currentMember?.status === 'pending' && activeParty?.leaderId !== user?.uid ? (
        <div className="px-4 py-8 space-y-6 flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <Lock className="w-16 h-16 text-primary mb-6 animate-pulse" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 mb-2">Waiting Room</h2>
          <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
            Matataki is assigning your judge delegation items...
          </p>
          <Button variant="outline" onClick={handleDisconnect} className="mt-8 rounded-full h-12 px-6 font-black uppercase text-[10px] tracking-widest text-slate-500">Leave Lobby</Button>
        </div>
      ) : !partyId ? ('''
legacy_text = legacy_text.replace(waiting_room_ui, new_waiting_room_ui)

# Make sliders read-only if not assigned
slider_ui_old = r'''                    <Slider value=\{\[scores\[item\.id\]\]\} max=\{100\} step=\{0\.1\} onValueChange=\{v => setScores\(p => \(\{ \.\.\.p, \[item\.id\]: v\[0\] \}\)\)\} />'''
slider_ui_new = r'''                    <Slider value={[scores[item.id]]} max={100} step={0.1} onValueChange={v => setScores(p => ({ ...p, [item.id]: v[0] }))} disabled={activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(item.id)} className={cn(activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(item.id) && "opacity-40 grayscale")} />'''
legacy_text = re.sub(slider_ui_old, slider_ui_new, legacy_text)

with open('src/app/performance/legacy-arena/page.tsx', 'w', encoding='utf-8') as f:
    f.write(legacy_text)

# -------------
# 2. Update performance/[id]/page.tsx
# -------------
with open('src/app/performance/[id]/page.tsx', 'r', encoding='utf-8') as f:
    perf_text = f.read()

perf_member_listener = r'''  const partyMessagesQuery = useMemoFirebase(() => partyId ? query(collection(db, 'parties', partyId, 'messages'), orderBy('timestamp', 'asc'), limit(50)) : null, [db, partyId])
  const { data: partyMessages } = useCollection(partyMessagesQuery)

  const currentMemberRef = useMemoFirebase(() => (partyId && user) ? doc(db, 'parties', partyId, 'members', user.uid) : null, [db, partyId, user])
  const { data: currentMember, loading: memberLoading } = useDoc(currentMemberRef)

  const activePartyRef = useMemoFirebase(() => partyId ? doc(db, 'parties', partyId) : null, [db, partyId])
  const { data: activeParty } = useDoc(activePartyRef)

  // Auto-join logic if URL has partyId but user is not in members
  useEffect(() => {
    if (user && partyId && !memberLoading && currentMember === null) {
      const memberRef = doc(db, 'parties', partyId, 'members', user.uid)
      setDocumentNonBlocking(memberRef, { 
        userId: user.uid, 
        userName: user.displayName || 'Judge', 
        userColor: getRandomColor(user.uid), 
        isTyping: false, 
        joinedAt: serverTimestamp(),
        status: 'pending',
        assignedItems: []
      }, { merge: true })
      updateDocumentNonBlocking(doc(db, 'users', user.uid), { activePartyId: partyId, updatedAt: serverTimestamp() })
    }
  }, [user, partyId, memberLoading, currentMember, db])
'''
perf_text = perf_text.replace(
    '''  const partyMessagesQuery = useMemoFirebase(() => partyId ? query(collection(db, 'parties', partyId, 'messages'), orderBy('timestamp', 'asc'), limit(50)) : null, [db, partyId])\n  const { data: partyMessages } = useCollection(partyMessagesQuery)''',
    perf_member_listener
)

perf_waiting_room_ui = r'''  if (perfInfo.status === 'upcoming' && !forceLive) {
    return <PrePerformanceHype team={perfInfo.name} region={perfInfo.region} startTime={perfInfo.startTime} onBack={() => router.back()} onEnterArena={() => setForceLive(true)} />
  }

  if (partyId && currentMember?.status === 'pending' && activeParty?.leaderId !== user?.uid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <LockIcon className="w-16 h-16 text-primary mb-6 animate-pulse" />
        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 mb-2">Waiting Room</h2>
        <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
          Matataki is assigning your judge delegation items...
        </p>
        <Button variant="outline" onClick={handleDisconnect} className="mt-12 rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest text-slate-500">Leave Lobby</Button>
      </div>
    )
  }

'''
perf_text = perf_text.replace(
    '''  if (perfInfo.status === 'upcoming' && !forceLive) {\n    return <PrePerformanceHype team={perfInfo.name} region={perfInfo.region} startTime={perfInfo.startTime} onBack={() => router.back()} onEnterArena={() => setForceLive(true)} />\n  }''',
    perf_waiting_room_ui
)

perf_slider = r'''<Slider value={[scores[cat.id]]} max={100} step={0.1} onValueChange={v => setScores(p => ({ ...p, [cat.id]: v[0] }))} disabled={submittedItems[cat.id]} />'''
perf_slider_new = r'''<Slider value={[scores[cat.id]]} max={100} step={0.1} onValueChange={v => setScores(p => ({ ...p, [cat.id]: v[0] }))} disabled={submittedItems[cat.id] || (activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(cat.id))} className={cn((activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(cat.id)) && "opacity-40 grayscale")} />'''
perf_text = perf_text.replace(perf_slider, perf_slider_new)

with open('src/app/performance/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(perf_text)

# -------------
# 3. Update vote/page.tsx for Creator logic
# -------------
with open('src/app/vote/page.tsx', 'r', encoding='utf-8') as f:
    vote_text = f.read()

old_vote_create = r'''    const memberRef = doc\(db, 'parties', partyId, 'members', user\.uid\)
    setDocumentNonBlocking\(memberRef, \{ 
      userId: user\.uid, 
      userName: user\.displayName \|\| 'Judge', 
      joinedAt: serverTimestamp\(\) 
    \}, \{ merge: true \}\)'''

new_vote_create = r'''    const memberRef = doc(db, 'parties', partyId, 'members', user.uid)
    const ITEMS = ['whakaeke', 'moteatea', 'poi', 'waiata_a_ringa', 'haka', 'whakawatea'];
    setDocumentNonBlocking(memberRef, { 
      userId: user.uid, 
      userName: user.displayName || 'Judge', 
      joinedAt: serverTimestamp(),
      status: 'approved',
      assignedItems: ITEMS
    }, { merge: true })'''

vote_text = re.sub(old_vote_create, new_vote_create, vote_text)

with open('src/app/vote/page.tsx', 'w', encoding='utf-8') as f:
    f.write(vote_text)

print("Waiting Room & UI Restrictors successfully injected!")
