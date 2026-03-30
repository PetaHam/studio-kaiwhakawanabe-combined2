import React from 'react'
import { Check } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { TEAMS_LIST, calculateMajorityRegionColor } from '@/lib/team-regions'

interface FollowGroupsListProps {
  selectedTeams: string[];
  onToggleTeam: (team: string) => void;
  height?: string | number;
}

export function FollowGroupsList({ selectedTeams, onToggleTeam, height = 300 }: FollowGroupsListProps) {
  const currentThemeColor = calculateMajorityRegionColor(selectedTeams);

  return (
    <ScrollArea className="pr-2" style={{ height }}>
      <div className="grid gap-2.5 pr-2">
        {TEAMS_LIST.map((team) => {
          const isSelected = selectedTeams.includes(team);
          return (
            <button
              key={team}
              onClick={() => onToggleTeam(team)}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                isSelected 
                  ? 'shadow-md scale-[1.01]' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
              )}
              style={isSelected ? { borderColor: currentThemeColor, backgroundColor: `${currentThemeColor}15` } : {}}
            >
              <span className={cn(
                "font-black text-[12px] uppercase italic tracking-tight transition-colors",
                isSelected ? "" : "text-slate-950"
              )}
              style={isSelected ? { color: currentThemeColor } : {}}
              >
                {team}
              </span>
              {isSelected && <Check className="w-5 h-5 animate-in zoom-in duration-200" style={{ color: currentThemeColor }} />}
            </button>
          )
        })}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
