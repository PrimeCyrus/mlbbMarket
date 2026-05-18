"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type ReviewSummary = {
  avg: number
  count: number
}

const cache = new Map<string, ReviewSummary>()

export function useSellerReviewSummary(sellerId?: string): ReviewSummary {
  const [summary, setSummary] = useState<ReviewSummary>({ avg: 0, count: 0 })

  useEffect(() => {
    if (!sellerId) {
      // Demo data for non-Firebase mode (or if no sellerId)
      // Keeping random for now as fallback if logic dictates
      // setSummary({ avg: 4.8, count: Math.floor(Math.random() * 50) + 5 })
      return
    }

    if (cache.has(sellerId)) {
      setSummary(cache.get(sellerId)!)
      return
    }

    const fetchReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('seller_id', sellerId)

      if (data) {
        const count = data.length
        const avg = count > 0 ? data.reduce((sum, r) => sum + (r.rating || 0), 0) / count : 0
        const result = { avg: Math.round(avg * 10) / 10, count }
        cache.set(sellerId, result)
        setSummary(result)
      }
    }

    fetchReviews()

    const channelName = `reviews-${sellerId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `seller_id=eq.${sellerId}` },
        () => {
          fetchReviews()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sellerId])

  return summary
}
