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

  const data = sellers

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
          Verified Dealers
        </h1>
        <p className="mt-1 max-w-prose text-sm text-slate-500 font-medium">Browse all verified dealers on MLBB Trade Hub.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="mt-3 h-4 w-28 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : data.length ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Link
              key={s.uid}
              href={`/seller/${s.uid}`}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition duration-200 ring-1 ring-transparent hover:border-cyan-200"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-slate-100 shadow-inner">
                  <AvatarImage
                    src={"/placeholder.svg?height=96&width=96&query=cyberpunk%20avatar"}
                    alt={s.fullName ? s.fullName + " avatar" : "Dealer avatar"}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-800 font-semibold">{initials(s.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-cyan-600 transition-colors">{s.fullName || s.email || "Dealer"}</p>
                  <p className="truncate text-xs text-slate-400">{s.email}</p>
                </div>
              </div>
              <div className="mt-3">
                <Badge className="rounded border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 font-semibold shadow-none">
                  Verified Dealer
                </Badge>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 p-10 text-sm text-slate-500 shadow-inner">
          No Verified Dealers available
        </div>
      )}
    </div>
  )
}
