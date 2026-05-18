"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"

export type SortOption = "price-asc" | "price-desc"

export type SearchFilterProps = {
  minPrice?: number
  maxPrice?: number
  onSearchChange?: (q: string) => void
  onRangeChange?: (range: [number, number]) => void
  onSortChange?: (sort: SortOption) => void
  onGirlsIdChange?: (val: boolean) => void
  onCollectorLevelChange?: (val: string) => void
}

export default function SearchFilter({
  minPrice = 0,
  maxPrice = 1000,
  onSearchChange = () => {},
  onRangeChange = () => {},
  onSortChange = () => {},
  onGirlsIdChange = () => {},
  onCollectorLevelChange = () => {},
}: SearchFilterProps) {
  const [q, setQ] = useState("")
  const [range, setRange] = useState<[number, number]>([minPrice, maxPrice])
  const [sort, setSort] = useState<SortOption>("price-asc")
  const [girlsId, setGirlsId] = useState(false)
  const [collectorLvl, setCollectorLvl] = useState("")

  useEffect(() => {
    setRange([minPrice, maxPrice])
  }, [minPrice, maxPrice])

  useEffect(() => {
    onSearchChange(q)
  }, [q, onSearchChange])

  useEffect(() => {
    onRangeChange(range)
  }, [range, onRangeChange])

  useEffect(() => {
    onSortChange(sort)
  }, [sort, onSortChange])

  useEffect(() => {
    onGirlsIdChange(girlsId)
  }, [girlsId, onGirlsIdChange])

  useEffect(() => {
    onCollectorLevelChange(collectorLvl)
  }, [collectorLvl, onCollectorLevelChange])

  const pretty = useMemo(
    () => ({
      min: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
        range[0],
      ),
      max: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
        range[1],
      ),
    }),
    [range],
  )

  return (
    <div className="backdrop-blur-sm bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium text-slate-700">
            Search Accounts
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="search"
              placeholder="Search by title, rank, or description..."
              className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-12 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Price Range
              </Label>
              <div className="text-sm font-medium text-cyan-300">
                {pretty.min} – {pretty.max}
              </div>
            </div>
            <div className="px-2">
              <Slider
                min={minPrice}
                max={maxPrice}
                step={10}
                value={range}
                onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
                className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-cyan-500 [&_[role=slider]]:to-fuchsia-500 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-sm"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>₹{minPrice}</span>
                <span>₹{maxPrice}</span>
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-700">Sort By</Label>
            <div className="flex gap-2">
              <Button
                variant={sort === "price-asc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSort("price-asc")}
                className={
                  sort === "price-asc"
                    ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white border-0 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:border-cyan-500/50 hover:text-cyan-600 bg-white"
                }
              >
                Price: Low to High
              </Button>
              <Button
                variant={sort === "price-desc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSort("price-desc")}
                className={
                  sort === "price-desc"
                    ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white border-0 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:border-cyan-500/50 hover:text-cyan-600 bg-white"
                }
              >
                Price: High to Low
              </Button>
            </div>
          </div>
        </div>

        {/* Extra Filters */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-2 border-t border-slate-100">
          <div className="space-y-2 mt-4">
            <Label htmlFor="collectorFilter" className="text-sm font-medium text-slate-700">
              Collector Level
            </Label>
            <select
              id="collectorFilter"
              className="flex h-10 w-full max-w-[200px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              value={collectorLvl}
              onChange={(e) => setCollectorLvl(e.target.value)}
            >
              <option value="">Any Level</option>
              <option value="Amateur">Amateur</option>
              <option value="Junior">Junior</option>
              <option value="Seasoned">Seasoned</option>
              <option value="Expert">Expert</option>
              <option value="Renowned">Renowned</option>
              <option value="Exalted">Exalted</option>
              <option value="Mega">Mega</option>
              <option value="World">World</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 mt-4 lg:mt-10">
            <input
              type="checkbox"
              id="girlsIdFilter"
              checked={girlsId}
              onChange={(e) => setGirlsId(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-slate-50 text-cyan-500"
            />
            <Label htmlFor="girlsIdFilter" className="cursor-pointer text-sm font-medium text-slate-700">
              Girls ID Only
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
