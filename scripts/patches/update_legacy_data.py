import re

with open("src/lib/legacy-data.ts", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update PerformanceTier
text = text.replace(
    "export type PerformanceTier = 'Epic' | 'Elite' | 'Ultimate' | 'Legendary' | 'S-Tier';",
    "export type PerformanceTier = 'Contender' | 'Epic' | 'Elite' | 'Ultimate' | 'Legendary' | 'S-Tier';"
)

additional_data = """
  // --- CONTENDERS (National Qualifiers with Item Placements) ---
  // 2025
  { id: 'tuhourangi-2025', name: 'Tūhourangi Ngāti Wāhiao', year: '2025', location: 'Te Arawa', image: PlaceHolderImages[0].imageUrl, tier: 'Contender', notableItems: ['1st= Whakaeke', '1st= Poi', 'Best Overall Composition'], ...calculateStats(84, { Whakaeke: 1, Poi: 1, Composition: 1 }) },
  { id: 'taumata-2025', name: 'Te Taumata o Apanui', year: '2025', location: 'Mātaatua', image: PlaceHolderImages[1].imageUrl, tier: 'Contender', notableItems: ['1st= Whakaeke', '1st= Waiata-ā-ringa'], ...calculateStats(82, { Whakaeke: 1, 'Waiata-ā-ringa': 1 }) },
  { id: 'pou-mangataawhiri-2025', name: 'Te Pou o Mangataawhiri', year: '2025', location: 'Tainui', image: PlaceHolderImages[2].imageUrl, tier: 'Contender', notableItems: ['3rd Mōteatea', '3rd= Whakawātea', '1st Haka Comp'], ...calculateStats(82, { Mōteatea: 3, Whakawātea: 3, Composition: 1 }) },
  { id: 'hekenga-2025', name: 'Te Hekenga ā Rangi', year: '2025', location: 'Te Arawa', image: PlaceHolderImages[3].imageUrl, tier: 'Contender', notableItems: ['1st= Poi', '1st= Haka'], ...calculateStats(83, { Poi: 1, Haka: 1 }) },
  { id: 'muriwhenua-2025', name: 'Muriwhenua', year: '2025', location: 'Te Tai Tokerau', image: PlaceHolderImages[0].imageUrl, tier: 'Contender', notableItems: ['3rd= Poi', '3rd= Whakawātea'], ...calculateStats(81, { Poi: 3, Whakawātea: 3 }) },
  { id: 'tahatu-2025', name: 'Te Taha Tū', year: '2025', location: 'Tāmaki Makaurau', image: PlaceHolderImages[1].imageUrl, tier: 'Contender', notableItems: ['2nd Haka'], ...calculateStats(81, { Haka: 2 }) },
  { id: 'iti-kahurangi-2025', name: 'Te Iti Kahurangi', year: '2025', location: 'Tainui', image: PlaceHolderImages[2].imageUrl, tier: 'Contender', notableItems: ['3rd= Whakawātea', '1st= Haka Comp'], ...calculateStats(81, { Whakawātea: 3, Composition: 1 }) },
  
  // 2023
  { id: 'angitu-2023', name: 'Angitū', year: '2023', location: 'Tāmaki Makaurau', image: PlaceHolderImages[3].imageUrl, tier: 'Contender', notableItems: ['1st= Whakaeke', '1st= Poi'], ...calculateStats(83, { Whakaeke: 1, Poi: 1 }) },
  { id: 'tauira-2023', name: 'Tauira mai Tawhiti', year: '2023', location: 'Mātaatua', image: PlaceHolderImages[0].imageUrl, tier: 'Contender', notableItems: ['1st= Whakaeke', '1st Whakawātea'], ...calculateStats(84, { Whakaeke: 1, Whakawātea: 1 }) },
  { id: 'tuhourangi-2023', name: 'Tūhourangi Ngāti Wāhiao', year: '2023', location: 'Te Arawa', image: PlaceHolderImages[1].imageUrl, tier: 'Contender', notableItems: ['2nd= Waiata-ā-ringa', '1st= Poi'], ...calculateStats(84, { 'Waiata-ā-ringa': 2, Poi: 1 }) },
  { id: 'hekenga-2023', name: 'Te Hekenga ā Rangi', year: '2023', location: 'Te Arawa', image: PlaceHolderImages[2].imageUrl, tier: 'Contender', notableItems: ['2nd= Waiata-ā-ringa'], ...calculateStats(80, { 'Waiata-ā-ringa': 2 }) },
  { id: 'tahatu-2023', name: 'Te Taha Tū', year: '2023', location: 'Tāmaki Makaurau', image: PlaceHolderImages[3].imageUrl, tier: 'Contender', notableItems: ['1st= Haka'], ...calculateStats(82, { Haka: 1 }) },
  { id: 'pou-mangataawhiri-2023', name: 'Te Pou o Mangataawhiri', year: '2023', location: 'Tainui', image: PlaceHolderImages[0].imageUrl, tier: 'Contender', notableItems: ['2nd= Mōteatea', '1st= Poi', '2nd= Whakawātea'], ...calculateStats(85, { Mōteatea: 2, Poi: 1, Whakawātea: 2 }) },
  
  // High-profile Alumni
  { id: 'manutaki-2025', name: 'Te Roopū Manutaki', year: '2025', location: 'Tāmaki Makaurau', image: PlaceHolderImages[1].imageUrl, tier: 'Contender', notableItems: ['National Qualifier'], ...calculateStats(80, {}) },
  { id: 'hatea-2025', name: 'Hātea Kapa Haka', year: '2025', location: 'Te Tai Tokerau', image: PlaceHolderImages[2].imageUrl, tier: 'Contender', notableItems: ['National Qualifier'], ...calculateStats(80, {}) },
  { id: 'ranginui-2025', name: 'Te Kapa Haka o Ngāti Ranginui', year: '2025', location: 'Ngāti Kahungunu', image: PlaceHolderImages[3].imageUrl, tier: 'Contender', notableItems: ['National Qualifier'], ...calculateStats(80, {}) },
  { id: 'ruatoki-2025', name: 'Te Kapa Haka o Ruātoki', year: '2025', location: 'Mātaatua', image: PlaceHolderImages[0].imageUrl, tier: 'Contender', notableItems: ['National Qualifier'], ...calculateStats(80, {}) },

];
"""

text = text.replace("\n];\n", additional_data)

with open("src/lib/legacy-data.ts", "w", encoding="utf-8") as f:
    f.write(text)
