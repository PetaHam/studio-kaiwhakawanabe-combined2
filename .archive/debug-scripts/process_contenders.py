import re
import json
import random

def normalize_name(name):
    return name.strip().lower().replace(' ', '').replace('-', '').replace('ō', 'o').replace('ā', 'a').replace('ū', 'u').replace('ī', 'i').replace('ē', 'e').replace('—', '')

with open('raw_contenders.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Split by year delimiter
year_blocks = re.split(r'(?=\n\d{4}\s*:\s*)', '\n' + text)

contenders_output = []
img_idx = 0

for block in year_blocks:
    if not block.strip(): continue
    year_match = re.search(r'\n(\d{4})\s*:', block)
    if not year_match: continue
    year = year_match.group(1)
    
    # 1. Extract Winners
    winners = []
    winners_match = re.search(r'WINNERS(.*?)(?:_{10,}|INDIVIDUAL TROPHY WINNERS)', block, re.DOTALL)
    if winners_match:
        for line in winners_match.group(1).split('\n'):
            if ':' in line:
                val = line.split(':')[1].strip()
                if val: winners.append(normalize_name(val))
            # Handle Next lines
            elif line.strip() and "First" not in line and "Second" not in line and "Third" not in line and "Equal" not in line:
                winners.append(normalize_name(line.strip()))
    
    # 2. Extract Trophies
    trophies = {}
    trophies_match = re.search(r'INDIVIDUAL TROPHY WINNERS(.*?)_{10,}', block, re.DOTALL)
    if trophies_match:
        current_trophy = None
        for line in trophies_match.group(1).split('\n'):
            line = line.strip()
            if not line: continue
            if ':' in line and line.isupper() or line.startswith('BEST') or line.startswith('WHAKAEKE') or line.startswith('MŌTEATEA') or line.startswith('WAIATA') or line.startswith('POI') or line.startswith('HAKA') or line.startswith('TE REO') or line.startswith('KĀKAHU'):
                current_trophy = line.split(':')[0].strip()
            elif current_trophy:
                if line.startswith('('): continue # E.g. (first equal)
                if ':' in line: # E.g. Kaitataki Tane: Name
                    group_name = line.split(':')[0].strip()
                else:
                    group_name = line
                
                norm_grp = normalize_name(group_name)
                if norm_grp not in trophies: trophies[norm_grp] = []
                # Map trophy names
                mapped_trophy = None
                if 'WHAKAEKE' in current_trophy: mapped_trophy = 'Whakaeke'
                elif 'MŌTEATEA' in current_trophy or 'MOTEATEA' in current_trophy: mapped_trophy = 'Mōteatea'
                elif 'Ā-RINGA' in current_trophy or 'A-RINGA' in current_trophy: mapped_trophy = 'Waiata-ā-ringa'
                elif 'POI' in current_trophy and 'COMPOSITION' not in current_trophy: mapped_trophy = 'Poi'
                elif 'HAKA' in current_trophy and 'COMPOSITION' not in current_trophy: mapped_trophy = 'Haka'
                elif 'WHAKAWĀTEA' in current_trophy or 'WHAKAWATEA' in current_trophy: mapped_trophy = 'Whakawātea'
                elif 'KĀKAHU' in current_trophy or 'KAKAHU' in current_trophy: mapped_trophy = 'Kākahu'
                elif 'TE REO' in current_trophy: mapped_trophy = 'Te Reo'
                elif 'COMPOSITION' in current_trophy: mapped_trophy = 'Composition'
                
                if mapped_trophy:
                    trophies[norm_grp].append(mapped_trophy)

    # 3. Extract Qualifying Roopu
    qual_match = re.search(r'QUALIFYING ROOP[UŪ](.*?)(?:_{10,}|JUDGES|NATIONAL COMMITTEE)', block, re.DOTALL)
    if qual_match:
        current_rohe = 'Unknown Region'
        for line in qual_match.group(1).split('\n'):
            line = line.strip()
            if not line: continue
            # If line is all caps and no numbers, it's a Rohe
            if line.isupper() and not re.search(r'\d', line):
                current_rohe = line
            # If line starts with a number, it's a group
            elif re.match(r'\d+\.', line):
                group_name = re.sub(r'^\d+\.\s*', '', line).strip()
                norm_grp = normalize_name(group_name)
                
                # Skip if it is an overall winner (S-Tier, Legendary, etc)
                is_winner = False
                for w in winners:
                    if norm_grp in w or w in norm_grp:
                        is_winner = True
                        break
                if is_winner: continue
                
                # Generate safe ID
                safe_id = re.sub(r'[^a-z0-9]', '', group_name.lower()) + f"-{year}"
                
                # Grab stats from trophies
                won_trophies = trophies.get(norm_grp, [])
                notable_arr = []
                stat_obj = []
                
                base_stat = 80
                if won_trophies:
                    base_stat += min(10, len(won_trophies) * 2)
                    
                for t in won_trophies:
                    notable_arr.append(f"Top 3 {t}")
                    if t != 'Kākahu' and t != 'Te Reo':
                        # Wrap key in quotes if it contains hyphens
                        key_str = f"'{t}'" if '-' in t else t
                        stat_obj.append(f"{key_str}: 3")
                
                # Format to string mapping piece
                notable_str = json.dumps(list(set(notable_arr)), ensure_ascii=False)
                if not notable_arr: notable_str = "['National Qualifier']"
                
                stats_str = "{" + ", ".join(stat_obj) + "}"
                
                # Title Case Region
                fmt_rohe = current_rohe.title().replace('(Formerly Waikato)', '').replace('(Formerly Takitimu)', '').strip()
                
                ts_str = f"  {{ id: '{safe_id}', name: '{group_name}', year: '{year}', location: '{fmt_rohe}', image: PlaceHolderImages[{img_idx % 4}].imageUrl, tier: 'Contender', notableItems: {notable_str}, ...calculateStats({base_stat}, {stats_str}) }},"
                contenders_output.append(ts_str)
                img_idx += 1

# Now we inject this into legacy-data.ts
with open('src/lib/legacy-data.ts', 'r', encoding='utf-8') as f:
    sys_text = f.read()

# We want to replace everything from "// --- CONTENDERS" to the end of the array `];`
split_idx = sys_text.find('  // --- CONTENDERS')
if split_idx != -1:
    end_idx = sys_text.find('];', split_idx)
    
    new_contenders_block = "  // --- CONTENDERS (National Qualifiers with Item Placements) ---\n" + "\n".join(contenders_output) + "\n"
    
    # Check if the line before split_idx has a comma. If not, we might need one.
    
    new_sys = sys_text[:split_idx] + new_contenders_block + sys_text[end_idx:]
    
    # Save it back
    with open('src/lib/legacy-data.ts', 'w', encoding='utf-8') as f:
        f.write(new_sys)
    print(f"Successfully injected {len(contenders_output)} Contenders into the vault!")
else:
    print("Could not find Contenders split line in legacy-data.ts!")
