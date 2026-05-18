"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import ListingCard from "@/components/listing-card"
import type { Listing } from "@/types/listing"
import { supabase } from "@/lib/supabase"

type Props = {
  listings: Listing[]
  loading?: boolean
}

type SellerInfo = {
  fullName?: string
  photoURL?: string
  sellerStatus?: string
}

export default function ListingGrid({ listings, loading = false }: Props) {
  const [sellers, setSellers] = useState<Record<string, SellerInfo>>({})

  const ids = useMemo(() => Array.from(new Set(listings.map((l) => l.userId).filter(Boolean))), [listings])

  useEffect(() => {
    if (ids.length === 0) {
      return
    }

    let cancelled = false
    const run = async () => {
      const { data } = await supabase.from('users').select('uid, full_name, photo_url, seller_status').in('uid', ids)

      const out: Record<string, SellerInfo> = {}
      if (data) {
        data.forEach((user: any) => {
          out[user.uid] = {
            fullName: user.full_name || "Seller",
            photoURL: user.photo_url || "",
            sellerStatus: user.seller_status || "not_applied",
          }
        })
      }

      if (!cancelled) setSellers(out)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [ids])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="aspect-[2/3] w-full animate-pulse bg-slate-100" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="flex items-center gap-2 pt-2">
                <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!listings.length) {
    return (
      <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 p-10 text-sm text-slate-500 shadow-sm">
        No listings yet. Be the first to post.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {listings.map((l) => {
        const seller = sellers[l.userId] || {}
        const primaryImage = Array.isArray(l.imageUrls) && l.imageUrls.length ? l.imageUrls[0] : undefined
        const isVerified = seller.sellerStatus === "approved"

        return (
          <ListingCard
            key={l.id}
            id={l.id}
            title={l.title}
            description={l.description}
            price={l.price}
            imageUrl={primaryImage}
            sellerId={l.userId}
            sellerName={seller.fullName}
            sellerAvatar={seller.photoURL}
            isVerifiedSeller={isVerified}
            isGirlsId={l.isGirlsId}
            collectorLevel={l.collectorLevel}
          />
        )
      })}
    </div>
  )
}
