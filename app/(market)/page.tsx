"use client"

import { useEffect, useMemo, useState } from "react"

import type { Listing } from "@/types/listing"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { TriangleAlert, UserCheck2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import ListingGrid from "@/components/listing-grid"
import { supabaseEnabled } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import SearchFilter from "@/components/search-filter"
import SellerApplyDialog from "@/components/seller-apply-dialog"

export default function Page() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const { user, profile } = useAuth()
  const [applyOpen, setApplyOpen] = useState(false)

  // search and filter
  const [q, setQ] = useState("")
  const [range, setRange] = useState<[number, number]>([0, 1000])
  const [sort, setSort] = useState<"price-asc" | "price-desc">("price-asc")
  const [filterGirlsId, setFilterGirlsId] = useState(false)
  const [filterCollector, setFilterCollector] = useState("")


  useEffect(() => {
    const fetchListings = async () => {
      const { data } = await supabase.from('listings').select('*').order('created_at', { ascending: false })
      if (data) {
        setListings(data.map(d => {
          let parsedUrls = d.image_urls || []
          if (typeof parsedUrls === 'string') {
            parsedUrls = parsedUrls.replace(/^{|}$/g, '').split(',').map((s: string) => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
          }
          
          return {
            id: d.id,
            title: d.title,
            description: d.description,
            price: d.price,
            imageUrls: parsedUrls,
            userId: d.user_id,
            isGirlsId: d.is_girls_id,
            collectorLevel: d.collector_level,
            status: d.status,
            createdAt: d.created_at, // string iso
            updatedAt: d.updated_at,
            soldAt: d.sold_at
          } as Listing
        }))
      }
      setLoading(false)
    }

    fetchListings()

    const channelName = 'public:listings'
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        fetchListings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const demoListings = useMemo<Listing[]>(
    () => [
      {
        id: "demo-1",
        title: "Mythic #120 ★ 70 Skins",
        description: "End-game account with meta heroes, exclusive skins, and high MMR. Secure and ready to transfer.",
        price: 299.0,
        imageUrls: ["/placeholder.svg?height=600&width=900"],
        userId: "demo",
        createdAt: null as any,
        status: "active",
      },
      {
        id: "demo-2",
        title: "Epic #50 • Clean History",
        description: "Solid mid-tier account. Main roles: Jungle/EXP. Original email available.",
        price: 129.0,
        imageUrls: ["/placeholder.svg?height=600&width=900"],
        userId: "demo",
        createdAt: null as any,
        status: "active",
      },
      {
        id: "demo-3",
        title: "Legend #80 • 40 Skins",
        description: "Balanced account, great for ranked grind.",
        price: 189.0,
        imageUrls: ["/placeholder.svg?height=600&width=900"],
        userId: "demo",
        createdAt: null as any,
        status: "active",
      },
    ],
    [],
  )

  const all = supabaseEnabled ? listings : demoListings
  const activeOnly = useMemo(() => all.filter((l) => (l.status ?? "active") !== "sold"), [all])
  const minPrice = useMemo(() => Math.min(...(activeOnly.map((d) => d.price) || [0, 1000])), [activeOnly])
  const maxPrice = useMemo(() => Math.max(...(activeOnly.map((d) => d.price) || [0, 1000])), [activeOnly])

  useEffect(() => {
    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
      setRange([minPrice, maxPrice])
    }
  }, [minPrice, maxPrice])

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase()
    const filteredData = activeOnly.filter((l) => {
      const matchQ =
        !qLower || l.title.toLowerCase().includes(qLower) || (l.description || "").toLowerCase().includes(qLower)
      const matchPrice = l.price >= range[0] && l.price <= range[1]
      
      const matchGirlsId = !filterGirlsId || l.isGirlsId
      const matchCollector = !filterCollector || l.collectorLevel === filterCollector
      
      return matchQ && matchPrice && matchGirlsId && matchCollector
    })
    const sorted = [...filteredData].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price
      if (sort === "price-desc") return b.price - a.price
      return 0
    })
    return sorted
  }, [activeOnly, q, range, sort, filterGirlsId, filterCollector])

  const canPost = !!user
  const canApply = false

  return (
    <div className="space-y-12">
      {!supabaseEnabled && (
        <Alert className="border-cyan-500/20 bg-cyan-500/5">
          <TriangleAlert className="h-4 w-4 text-cyan-400" />
          <AlertTitle className="text-cyan-300">Connect Supabase to enable real data</AlertTitle>
          <AlertDescription className="text-cyan-200/80">
            Set your NEXT_PUBLIC_SUPABASE_* keys to enable authentication, uploads, and live listings.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-21x9">
        <div className="relative h-[250px] sm:h-[350px] lg:h-[455px]">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner.jpg-a34Qqa8dleCWVmbDlbew6pD1KExgin.jpeg"
            alt="Mobile Legends Bang Bang Kishin Event"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          {/* Gradient overlays for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Content overlay - centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 px-6 max-w-4xl">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent sm:text-4xl lg:text-5xl">

                </h2>
                <p className="text-lg text-gray-200 sm:text-xl lg:text-2xl">

                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                {canPost && (
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 text-white hover:from-cyan-600 hover:via-fuchsia-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link href="/new">
                      <Plus className="mr-2 h-5 w-5" />
                      Post a Listing
                    </Link>
                  </Button>
                )}
                {canApply && supabaseEnabled && (
                  <Button
                    onClick={() => setApplyOpen(true)}
                    size="lg"
                    variant="outline"
                    className="border-emerald-500/40 bg-black/20 backdrop-blur-sm text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                  >
                    <UserCheck2 className="mr-2 h-5 w-5" />
                    Become a Seller
                  </Button>
                )}
              </div>

              {!!profile && supabaseEnabled && (
                <div className="flex flex-wrap justify-center gap-2">
                  {profile.sellerStatus === "approved" && (
                    <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 px-3 py-1">
                      ✓ Seller verified
                    </Badge>
                  )}
                  {profile.sellerStatus === "pending" && (
                    <Badge className="border-cyan-500/40 bg-cyan-500/15 text-cyan-300 px-3 py-1">
                      ⏳ Seller application pending
                    </Badge>
                  )}
                  {profile.sellerStatus === "rejected" && (
                    <Badge className="border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300 px-3 py-1">
                      ✗ Seller application rejected
                    </Badge>
                  )}
                  {profile.role === "admin" && (
                    <Badge className="border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300 px-3 py-1">
                      👑 Admin
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="space-y-6">
        <div className="sticky top-4 z-10">
          <SearchFilter
            minPrice={Number.isFinite(minPrice) ? minPrice : 0}
            maxPrice={Number.isFinite(maxPrice) ? maxPrice : 1000}
            onSearchChange={setQ}
            onRangeChange={setRange}
            onSortChange={setSort}
            onGirlsIdChange={setFilterGirlsId}
            onCollectorLevelChange={setFilterCollector}
          />
        </div>
      </section>

      {/* Listings Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-800">
              {filtered.length} {filtered.length === 1 ? "Account" : "Accounts"} Available
            </h3>
            <p className="text-sm text-slate-500 mt-1">{q && `Showing results for "${q}"`}</p>
          </div>
          {filtered.length > 0 && (
            <div className="text-sm font-medium text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full">
              Price range: ₹{Math.min(...filtered.map((l) => l.price))} - ₹{Math.max(...filtered.map((l) => l.price))}
            </div>
          )}
        </div>

        <ListingGrid listings={filtered} loading={loading} />

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl opacity-40">🎮</div>
            <h3 className="text-xl font-semibold text-slate-700">No accounts found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Try adjusting your search criteria or check back later for new listings.
            </p>
          </div>
        )}
      </section>

      <SellerApplyDialog open={applyOpen} onOpenChange={setApplyOpen} />
    </div>
  )
}
