export const REGION_COLORS: Record<string, string> = {
  'Te Arawa': '#EF4444',            // Red
  'Tāmaki Makaurau': '#3B82F6',     // Blue
  'Mātaatua': '#22C55E',            // Green
  'Tairāwhiti': '#F97316',          // Orange
  'Te Tai Tokerau': '#06B6D4',      // Cyan
  'Tainui': '#EAB308',              // Gold
  'Te Whanganui-a-Tara': '#EC4899', // Pink
  'Te Tai Hau-ā-uru': '#8B5CF6',    // Violet
  'Waitaha': '#14B8A6',             // Teal
  'Takitimu': '#A855F7',            // Purple
  'Tauranga Moana': '#0EA5E9',      // Sky
  'Aotea': '#84CC16',               // Lime
  'Default': '#FF4500'              // App Default (Orange-Red)
};

export const TEAM_REGIONS: Record<string, string> = {
  "Te Whānau-ā-Apanui": "Mātaatua",
  "Te Mātārae I Ōrehu": "Te Arawa",
  "Te Waka Huia": "Tāmaki Makaurau",
  "Waihīrere Māori Club": "Tairāwhiti",
  "Whāngāra Mai Tawhiti": "Tairāwhiti",
  "Te Iti Kahurangi": "Tainui",
  "Ngā Tūmanako": "Tāmaki Makaurau",
  "Te Pīkikōtuku o Ngāti Rongomai": "Te Arawa",
  "Te Kapa Haka o Ngāti Whakaue": "Te Arawa",
  "Angitū": "Tāmaki Makaurau",
  "Ōpōtiki Mai Tawhiti": "Mātaatua",
  "Ngāti Rangiwewehi": "Te Arawa",
  "Te Rangiura o Wairarapa": "Te Whanganui-a-Tara",
  "Te Kapa Haka o Kahungunu": "Takitimu",
  "Te Taumata o Apanui": "Mātaatua",
  "Ōhinemataroa ki Ruatāhuna": "Mātaatua",
  "Te Kapa Haka o Te Whakatōhea": "Mātaatua",
  "Tauira-mai-tawhiti": "Mātaatua",
  "Ngā Purapura o Te Taihauāuru": "Te Tai Hau-ā-uru",
  "Te Reanga Mōrehu o Ratana": "Aotea",
  "Ngā Waihotanga": "Te Tai Hau-ā-uru",
  "Te Kura Nui o Paerangi": "Te Tai Hau-ā-uru",
  "Te Hekenga a Rangi": "Te Whanganui-a-Tara",
  "Te Wharehaka o Te Puku o te ika": "Waitaha",
  "Tuhourangi Ngāti Wahiao": "Te Arawa",
  "Te Roopū Manutaki": "Tāmaki Makaurau",
  "Muriwhenua": "Te Tai Tokerau",
  "Hātea Kapa Haka": "Te Tai Tokerau",
  "Te Manu Huia": "Tāmaki Makaurau",
  "Te Kāhui Maunga": "Aotea",
  "Te Taha Tū": "Tāmaki Makaurau",
  "Ngā Taonga Mai Tawhiti": "Te Whanganui-a-Tara",
  "Te Wharekura o Hoani Waititi": "Tāmaki Makaurau",
  "Ngā Puna o Waiorea": "Tāmaki Makaurau",
  "Te Puku o te Ika": "Waitaha",
  "Te Wharehuia": "Tāmaki Makaurau",
  "Ngāti Ranginui": "Tauranga Moana",
  "Matangirau": "Te Tai Tokerau",
  "Te Kapa Haka o Ruātoki": "Mātaatua",
  "Te Whānau a Ruataupare": "Tairāwhiti",
  "Te Kapa Haka o Ngāti Porou": "Tairāwhiti",
  "Te Tai Tokerau": "Te Tai Tokerau",
  "Te Kapa Haka o Ngāti Hine": "Te Tai Tokerau",
  "Te Kapa Haka o Ngāti Kahungunu ki Heretaunga": "Takitimu"
};

export const TEAMS_LIST = Object.keys(TEAM_REGIONS).sort();

export function calculateMajorityRegionColor(teams: string[]): string {
  if (!teams || teams.length === 0) return REGION_COLORS['Default'];

  const regionCounts: Record<string, number> = {};
  
  teams.forEach(team => {
    const region = TEAM_REGIONS[team] || 'Default';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });

  let majorityRegion = 'Default';
  let maxCount = 0;

  Object.entries(regionCounts).forEach(([region, count]) => {
    if (count > maxCount && region !== 'Default') {
      majorityRegion = region;
      maxCount = count;
    }
  });

  return REGION_COLORS[majorityRegion] || REGION_COLORS['Default'];
}
