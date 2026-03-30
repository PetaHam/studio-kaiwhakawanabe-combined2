import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Chat Party Card Link to Div onClick wrapper
chat_party_old = r'''            <Link href={user?.isAnonymous ? "/login" : "/performance/legacy-arena?action=create"}>
              <Card id="tour-party-card" className="bg-white border border-slate-200 shadow-sm hover:border-primary/30 transition-all rounded-[2.5rem] overflow-hidden group">'''

chat_party_new = r'''            <div className="cursor-pointer" onClick={() => {
              if (user?.isAnonymous) {
                toast({ title: "Registration Required", description: "Live Lobbies are reserved for registered judges. Please link an email in Settings." });
              } else {
                router.push('/performance/legacy-arena');
              }
            }}>
              <Card id="tour-party-card" className="bg-white border border-slate-200 shadow-sm hover:border-primary/30 transition-all rounded-[2.5rem] overflow-hidden group">'''

text = text.replace(chat_party_old, chat_party_new)
text = text.replace('''              </Card>\n            </Link>''', '''              </Card>\n            </div>''', 1)  # Only replace the first occurrence (Chat Party block)

# 2. Update Group Judging Button Logic
group_judging_old = r'''              onClick={() => {
                if (user?.isAnonymous) {
                  toast({ title: "Registration Required", description: "Group Judging is reserved for registered judges." });
                  router.push('/login');
                } else {
                  router.push('/performance/legacy-arena');
                }
              }}'''

group_judging_new = r'''              onClick={() => {
                if (user?.isAnonymous) {
                  toast({ title: "Registration Required", description: "Group Judging is reserved for registered judges. Please link an email in Settings." });
                } else {
                  router.push('/performance/legacy-arena');
                }
              }}'''

text = text.replace(group_judging_old, group_judging_new)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Routing architecture fixed!")
