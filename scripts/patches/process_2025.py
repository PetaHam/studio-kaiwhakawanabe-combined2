import re
import json

def normalize_name(name):
    return name.strip().lower().replace(' ', '').replace('-', '').replace('ō', 'o').replace('ā', 'a').replace('ū', 'u').replace('ī', 'i').replace('ē', 'e').replace('—', '')

with open('raw_contenders.txt', 'r', encoding='utf-8') as f:
    text = f.read()

year_blocks = re.split(r'(?=\n\d{4}\s*:\s*)', '\n' + text)

block_2025 = None
for b in year_blocks:
    if '2025 : Te Matatini' in b:
        block_2025 = b
        break

if block_2025:
    # 1. Extract Winners
    winners = []
    winners_match = re.search(r'WINNERS(.*?)(?:_{10,}|INDIVIDUAL TROPHY WINNERS)', block_2025, re.DOTALL)
    if winners_match:
        for line in winners_match.group(1).split('\n'):
            if ':' in line:
                val = line.split(':')[1].strip()
                if val: winners.append(normalize_name(val))
            elif line.strip() and "First" not in line and "Second" not in line and "Third" not in line and "Equal" not in line:
                winners.append(normalize_name(line.strip()))
                
    # 2. Extract Trophies
    trophies = {}
    trophies_match = re.search(r'INDIVIDUAL TROPHY WINNERS(.*?)_{10,}', block_2025, re.DOTALL)
    if trophies_match:
        current_trophy = None
        for line in trophies_match.group(1).split('\n'):
            line = line.strip()
            if not line: continue
            if ':' in line and (line.isupper() or line.startswith('BEST') or 'WHAKAEKE' in line or 'MŌTEATEA' in line or 'WAIATA' in line or 'POI' in line or 'HAKA' in line or 'TE REO' in line or 'KĀKAHU' in line):
                current_trophy = line.split(':')[0].strip()
            elif current_trophy:
                if line.startswith('('): continue
                if ':' in line: group_name = line.split(':')[0].strip()
                else: group_name = line
                
                norm_grp = normalize_name(group_name)
                if norm_grp not in trophies: trophies[norm_grp] = []
                
                mapped_trophy = None
                if 'WHAKAEKE' in current_trophy: mapped_trophy = 'Whakaeke'
                elif 'MŌTEATEA' in current_trophy: mapped_trophy = 'Mōteatea'
                elif 'Ā-RINGA' in current_trophy: mapped_trophy = 'Waiata-ā-ringa'
                elif 'POI' in current_trophy and 'COMPOSITION' not in current_trophy: mapped_trophy = 'Poi'
                elif 'HAKA' in current_trophy and 'COMPOSITION' not in current_trophy: mapped_trophy = 'Haka'
                elif 'WHAKAWĀTEA' in current_trophy: mapped_trophy = 'Whakawātea'
                elif 'KĀKAHU' in current_trophy: mapped_trophy = 'Kākahu'
                elif 'TE REO' in current_trophy: mapped_trophy = 'Te Reo'
                elif 'COMPOSITION' in current_trophy: mapped_trophy = 'Composition'
                
                if mapped_trophy: trophies[norm_grp].append(mapped_trophy)

    # 3. Extract Qualifying Roopu precisely
    # Since 2025 `JUDGES` regex failed earlier, we split the block directly
    split1 = block_2025.split('QUALIFYING ROOPŪ')
    if len(split1) > 1:
        qual_text = split1[1]
        # End at either JUDGES or end of block
        if 'JUDGES' in qual_text:
            qual_text = qual_text.split('JUDGES')[0]
        elif 'NATIONAL COMMITTEE' in qual_text:
            qual_text = qual_text.split('NATIONAL COMMITTEE')[0]
            
        contenders_output = []
        current_rohe = 'Unknown Region'
        img_idx = 0
        
        for line in qual_text.split('\n'):
            line = line.strip()
            if not line: continue
            if line.isupper() and not re.search(r'\d', line) and not line.startswith('_'):
                current_rohe = line
            elif re.match(r'\d+\.', line):
                group_name = re.sub(r'^\d+\.\s*', '', line).strip()
                norm_grp = normalize_name(group_name)
                
                # We already added Ratana earlier, skip it
                if 'renga' in norm_grp and 'rat' in norm_grp:
                    continue
                
                is_winner = False
                for w in winners:
                    if norm_grp in w or w in norm_grp:
                        is_winner = True; break
                if is_winner: continue
                
                if not group_name: continue
                
                safe_id = re.sub(r'[^a-z0-9]', '', group_name.lower()) + "-2025"
                
                won_trophies = trophies.get(norm_grp, [])
                notable_arr = []
                stat_obj = []
                base_stat = 80
                
                if won_trophies:
                    base_stat += min(10, len(won_trophies) * 2)
                    
                seen_trophy = set()
                for t in won_trophies:
                    if t not in seen_trophy:
                        seen_trophy.add(t)
                        notable_arr.append(f"Top 3 {t}")
                        if t != 'Kākahu' and t != 'Te Reo':
                            key_str = f"'{t}'" if '-' in t else t
                            stat_obj.append(f"{key_str}: 3")
                            
                notable_str = json.dumps(list(set(notable_arr)), ensure_ascii=False) if notable_arr else "['National Qualifier']"
                stats_str = "{" + ", ".join(stat_obj) + "}"
                fmt_rohe = current_rohe.title().strip()
                
                ts_str = f"  {{ id: '{safe_id}', name: \"{group_name}\", year: '2025', location: '{fmt_rohe}', image: PlaceHolderImages[{img_idx % 4}].imageUrl, tier: 'Contender', notableItems: {notable_str}, ...calculateStats({base_stat}, {stats_str}) }},"
                contenders_output.append(ts_str)
                img_idx += 1
                
        # Append to legacy-data.ts
        with open('src/lib/legacy-data.ts', 'r', encoding='utf-8') as f:
            sys_text = f.read()
            
        end_idx = sys_text.rfind('];')
        if end_idx != -1:
            new_sys = sys_text[:end_idx] + "\n".join(contenders_output) + "\n" + sys_text[end_idx:]
            with open('src/lib/legacy-data.ts', 'w', encoding='utf-8') as f:
                f.write(new_sys)
            print(f"Successfully injected {len(contenders_output)} 2025 Contenders!")
        else:
            print("Failed to find ];")
