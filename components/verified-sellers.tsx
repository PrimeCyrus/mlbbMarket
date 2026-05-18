"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase, supabaseEnabled } from "@/lib/supabase"
import type { UserProfile } from "@/types/user"

function initials(name?: string) {
  if (!name) return "ML"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "ML"
}

export default function VerifiedSellersBar() {
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

    const channelName = 'public:users:verified'
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
    ],
    [],
  )

  const data = supabaseEnabled ? sellers : demo

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"
            >
              <div className="h-6 w-6 animate-pulse rounded-full bg-neutral-800" />
              <div className="h-4 w-20 animate-pulse rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data.length) return null

  return (
    <section aria-label="Verified sellers" className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">Verified Sellers</h2>
        <Link href="/sellers" className="text-xs text-cyan-300 hover:text-cyan-200">
          View all
        </Link>
      </div>
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {data.map((s) => (
          <Link
            key={s.uid}
            href={`/seller/${s.uid}`}
            className="group flex shrink-0 items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 ring-1 ring-transparent transition hover:ring-cyan-500/30"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={"/placeholder.svg?height=64&width=64&query=cyberpunk%20avatar"}
                alt={s.fullName ? s.fullName + " avatar" : "Seller avatar"}
              />
              <AvatarFallback className="text-[10px]">{initials(s.fullName)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-neutral-200">{s.fullName || s.email || "Seller"}</span>
            <Badge className="ml-1 rounded px-1.5 py-0 text-[10px] leading-4 border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
              Verified
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  )
}
