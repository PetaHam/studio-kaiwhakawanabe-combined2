'use client'

import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchAndFilterProps {
  data: any[]
  searchFields: string[]
  filters?: {
    label: string
    key: string
    options: { label: string; value: any }[]
  }[]
  onResultsChange?: (results: any[]) => void
  placeholder?: string
  className?: string
}

export function SearchAndFilter({
  data,
  searchFields,
  filters = [],
  onResultsChange,
  placeholder = 'Search...',
  className
}: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)

  const filteredResults = useMemo(() => {
    let results = data

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(item => 
        searchFields.some(field => {
          const value = getNestedValue(item, field)
          return value && String(value).toLowerCase().includes(query)
        })
      )
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        results = results.filter(item => getNestedValue(item, key) === value)
      }
    })

    if (onResultsChange) {
      onResultsChange(results)
    }

    return results
  }, [data, searchQuery, activeFilters, searchFields])

  const clearSearch = () => {
    setSearchQuery('')
    setActiveFilters({})
  }

  const toggleFilter = (key: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value
    }))
  }

  const activeFilterCount = Object.values(activeFilters).filter(v => v !== null).length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-24 h-14 rounded-2xl bg-slate-50 border-slate-200 text-base"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-10 px-4 rounded-xl font-bold text-xs uppercase",
              showFilters && "bg-primary text-slate-950"
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 rounded-full bg-red-500 text-white text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {(searchQuery || activeFilterCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-10 w-10 p-0 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && filters.length > 0 && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-slide-down">
          {filters.map((filter) => (
            <div key={filter.key} className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {filter.label}
              </label>
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => (
                  <Button
                    key={option.value}
                    variant={activeFilters[filter.key] === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFilter(filter.key, option.value)}
                    className={cn(
                      "h-9 px-4 rounded-full text-xs font-bold",
                      activeFilters[filter.key] === option.value
                        ? "bg-primary text-slate-950"
                        : "bg-white"
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {(searchQuery || activeFilterCount > 0) && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
          </p>
        </div>
      )}
    </div>
  )
}

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}
