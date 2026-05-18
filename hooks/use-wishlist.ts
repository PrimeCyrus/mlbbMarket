import * as React from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"

export type WishlistItem = {
  id: string // This is the listing ID
  title: string
  price: number
  imageUrl?: string
  sellerId?: string
  updatedAt?: any
}

const LOCAL_KEY = "mlbb_wishlist_v1"

export function useWishlist() {
  const { user } = useAuth()
  const [items, setItems] = React.useState<WishlistItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user) {
      try {
        const raw = localStorage.getItem(LOCAL_KEY)
        setItems(raw ? (JSON.parse(raw) as WishlistItem[]) : [])
      } catch {
        setItems([])
      }
      setLoading(false)
      const onStorage = (e: StorageEvent) => {
        if (e.key === LOCAL_KEY) {
          try {
            setItems(e.newValue ? (JSON.parse(e.newValue) as WishlistItem[]) : [])
          } catch { }
        }
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    }

    // Load initial data
    const fetchWishlist = async () => {
      const { data } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        setItems(data.map(d => ({
          id: d.listing_id,
          title: d.title,
          price: d.price,
          imageUrl: d.image_url,
          sellerId: d.seller_id,
          updatedAt: d.created_at
        })))
      }
      setLoading(false)
    }

    fetchWishlist()

    // Remove any stale channel with this name before subscribing (fixes StrictMode double-mount)
    const channelName = `wishlist-${user.id}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishlist', filter: `user_id=eq.${user.id}` },
        () => {
          fetchWishlist()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const persistLocal = (next: WishlistItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
    } catch { }
  }

  const add = async (item: WishlistItem) => {
    if (user) {
      // Check if exists to avoid duplicates (though DB unique constraint should handle it too)
      const exists = items.some(i => i.id === item.id)
      if (exists) return

      await supabase.from('wishlist').insert({
        user_id: user.id,
        listing_id: item.id,
        title: item.title,
        price: item.price,
        image_url: item.imageUrl || "",
        seller_id: item.sellerId || "",
        created_at: new Date().toISOString()
      })
      return
    }
    const exists = items.some((i) => i.id === item.id)
    if (exists) return
    persistLocal([{ ...item, updatedAt: Date.now() }, ...items])
  }

  const remove = async (id: string) => {
    if (user) {
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', id)
      return
    }
    persistLocal(items.filter((i) => i.id !== id))
  }

  const clear = async () => {
    if (user) {
      setItems([])
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
      return
    }
    persistLocal([])
  }

  const has = (id: string) => items.some((i) => i.id === id)
  const count = items.length

  return { items, count, loading, add, remove, clear, has }
}


