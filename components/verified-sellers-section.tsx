"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { supabase, supabaseEnabled } from "@/lib/supabase"
import type { UserProfile } from "@/types/user"
import { ChevronRight, Star } from "lucide-react"

function initials(name?: string) {
  if (!name) return "ML"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "ML"
}

export default function VerifiedSellersSection() {
  const [sellers, setSellers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSellers = async () => {
      const { data } = await supabase.from('users').select('*').eq('seller_status', 'approved')
      if (data) {
        setSellers(data as UserProfile[])
      }
      setLoading(false)
    }

    fetchSellers()

    const channelName = 'public:users:verified-section'
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'seller_status=eq.approved' }, () => {
        fetchSellers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const demo = useMemo<UserProfile[]>(
    () => [
      {
        uid: "demo-seller-1",
        fullName: "Aether Prime",
        email: "demo@mlbb.example",
        role: "seller",
        sellerStatus: "approved",
      } as any,
      {
        uid: "demo-seller-2",
        fullName: "Nova Edge",
        email: "demo2@mlbb.example",
        role: "seller",
        sellerStatus: "approved",
      } as any,
      {
        uid: "demo-seller-3",
        fullName: "Cyber Phoenix",
        email: "demo3@mlbb.example",
        role: "seller",
        sellerStatus: "approved",
      } as any,
      {
        uid: "demo-seller-4",
        fullName: "Digital Warrior",
        email: "demo4@mlbb.example",
        role: "seller",
        sellerStatus: "approved",
      } as any,
    ],
    [],
  )

  const data = supabaseEnabled ? sellers : demo

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Trusted Sellers
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="flex-shrink-0 w-64 border-neutral-800 bg-neutral-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-800" />
                    <div className="h-3 w-20 animate-pulse rounded bg-neutral-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data.length) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Trusted Sellers
          </h2>
          <p className="text-neutral-400">Verified professionals with proven track records</p>
        </div>
        <Link
          href="/sellers"
          className="flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {data.slice(0, 6).map((seller) => (
          <Link key={seller.uid} href={`/seller/${seller.uid}`} className="group flex-shrink-0">
            <Card className="w-64 border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900/70 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-emerald-500/20">
                      <AvatarImage
                        src={seller.photoURL || "/placeholder.svg?height=64&width=64&query=cyberpunk%20avatar"}
                        alt={seller.fullName ? seller.fullName + " avatar" : "Seller avatar"}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-emerald-500 text-white text-sm font-semibold">
                        {initials(seller.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-neutral-900 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-200 truncate group-hover:text-cyan-300 transition-colors">
                      {seller.fullName || seller.email || "Seller"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                        Trusted Seller
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-neutral-400">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>4.8 (24 reviews)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
