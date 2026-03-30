import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update the GUEST ACCESS condition
old_cond = "{!isUserLoading && (user?.isAnonymous || !user) && ("
new_cond = "{!isUserLoading && user?.isAnonymous && ("
text = text.replace(old_cond, new_cond)

# 2. Move JudgesHonourCard
# Find and extract the block
block_regex = r'(\s*<div className="w-full px-4 mt-2 animate-in slide-in-from-bottom-9 duration-700">\s*<JudgesHonourCard onOpen=\{[^}]+\} />\s*</div>)'

# Extract it
match = re.search(block_regex, text)
if match:
    block_str = match.group(1)
    # Remove it from its original spot
    text = text.replace(block_str, "")
    
    # Insert it right after the closing tag of the daily poll section: </section>
    # There are multiple </section> tags, but the poll section ends with:
    poll_end_regex = r'(</section>\s+<Dialog open=\{isHubOpen\})'
    
    replacement_str = f'</section>\n{block_str}\n\n      <Dialog open={{isHubOpen}}'
    
    text = re.sub(poll_end_regex, replacement_str, text)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("UX refinement and Guest restriction complete!")
