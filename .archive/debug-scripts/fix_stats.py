import re

def fix_file():
    with open('src/lib/legacy-data.ts', 'r', encoding='utf-8') as f:
        text = f.read()

    def dedupe(match):
        base_stat = match.group(1)
        stats_str = match.group(2)
        if not stats_str.strip():
            return f"calculateStats({base_stat}, {{}})"
            
        pairs = [p.strip() for p in stats_str.split(',')]
        seen = set()
        deduped = []
        for p in pairs:
            if not p: continue
            key = p.split(':')[0].strip()
            if key not in seen:
                seen.add(key)
                deduped.append(p)
                
        return f"calculateStats({base_stat}, {{{', '.join(deduped)}}})"

    new_text = re.sub(r'calculateStats\((\d+),\s*\{([^\}]*)\}\)', dedupe, text)
    
    with open('src/lib/legacy-data.ts', 'w', encoding='utf-8') as f:
        f.write(new_text)

fix_file()
