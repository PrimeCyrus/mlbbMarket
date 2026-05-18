"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase, supabaseEnabled } from "@/lib/supabase"
import type { UserProfile } from "@/types/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

function initials(name?: string) {
  if (!name) return "ML"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "ML"
}

export default function SellersDirectoryPage() {
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

    const channelName = 'public:users:sellers'
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
        fullName: "Zenith Rush",
        email: "demo3@mlbb.example",
        role: "seller",
        sellerStatus: "approved",
      } as any,
    ],
    [],
  )

  const data = supabaseEnabled ? sellers : demo

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-emerald-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
          Verified Sellers
        </h1>
        <p className="mt-1 max-w-prose text-sm text-neutral-400">Browse all verified sellers on MLBB Market.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-800" />
              </div>
              <div className="mt-3 h-4 w-28 animate-pulse rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      ) : data.length ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Link
              key={s.uid}
              href={`/seller/${s.uid}`}
              className="group rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 ring-1 ring-transparent transition hover:ring-cyan-500/30"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={"/placeholder.svg?height=96&width=96&query=cyberpunk%20avatar"}
                    alt={s.fullName ? s.fullName + " avatar" : "Seller avatar"}
                  />
                  <AvatarFallback>{initials(s.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-100">{s.fullName || s.email || "Seller"}</p>
                  <p className="truncate text-xs text-neutral-400">{s.email}</p>
                </div>
              </div>
              <div className="mt-3">
                <Badge className="rounded border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                  Verified seller
                </Badge>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="grid place-items-center rounded-xl border border-neutral-800 bg-neutral-950/60 p-10 text-sm text-neutral-400">
          No verified sellers yet.
        </div>
      )}
    </div>
  )
}
