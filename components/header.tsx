"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AuthProvider, { useAuth } from "@/components/auth-provider"
import LoginDialog from "@/components/login-dialog"
import { cn } from "@/lib/utils"
import { Heart, Bell } from "lucide-react"
import WishlistSheet from "./wishlist-sheet"
import { useWishlist } from "@/hooks/use-wishlist"
import ContactSellerDialog from "@/components/chat/contact-seller-dialog"
import SellerInboxDialog from "@/components/chat/seller-inbox-dialog"
import { supabase, supabaseEnabled } from "@/lib/supabase"

function initials(name?: string, email?: string) {
  const base = name || email || "U"
  const parts = base.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U"
}

function HeaderInner() {
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const { user, profile, loading, signOut } = useAuth()
  const { count } = useWishlist()
  const canPost = !!user

  // Notifications (recent conversations for buyer or seller)
  type Conversation = {
    id: string
    listingId: string
    sellerId: string
    buyerId: string
    buyerName?: string | null
    lastMessage?: string | null
    lastSenderId?: string | null
    updatedAt?: any
    buyerLastReadAt?: any
    sellerLastReadAt?: any
  }
  const [convos, setConvos] = useState<Conversation[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({})

  // Dialog state
  const [contactOpen, setContactOpen] = useState(false)
  const [contactListingId, setContactListingId] = useState<string | null>(null)
  const [contactSellerId, setContactSellerId] = useState<string | null>(null)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxListingId, setInboxListingId] = useState<string | null>(null)
  const [inboxConversationId, setInboxConversationId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setConvos([])
      return
    }

    const fetchConvos = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyerId.eq.${user.id},sellerId.eq.${user.id}`)
        .order('updatedAt', { ascending: false })

      if (data) {
        setConvos(data as any[])
      }
    }

    fetchConvos()

    const channelName = `user_conversations:${user.id}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `buyerId=eq.${user.id}`
      }, () => fetchConvos())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `sellerId=eq.${user.id}`
      }, () => fetchConvos())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Fetch listing titles for conversations to display in notifications
  useEffect(() => {
    if (!supabaseEnabled || !convos.length) return
    const uniqueIds = Array.from(new Set(convos.map((c) => c.listingId)))
    const missing = uniqueIds.filter((id) => !listingTitles[id])
    if (!missing.length) return
      ; (async () => {
        const { data } = await supabase
          .from('listings')
          .select('id, title')
          .in('id', missing)

        if (data) {
          const updates: Record<string, string> = {}
          data.forEach((item: any) => {
            if (item.title) updates[item.id] = item.title
          })
          if (Object.keys(updates).length) setListingTitles((prev) => ({ ...prev, ...updates }))
        }
      })()
  }, [convos, listingTitles])

  const onClickConversation = (c: Conversation) => {
    if (!user) return
    if (c.buyerId === user.id) {
      // Open buyer chat to seller
      setContactListingId(c.listingId)
      setContactSellerId(c.sellerId)
      setContactOpen(true)
      setNotifOpen(false)
    } else if (c.sellerId === user.id) {
      // Open seller inbox for this listing
      setInboxListingId(c.listingId)
      setInboxConversationId(c.id)
      setInboxOpen(true)
      setNotifOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4">
        <Link
          href="/"
          className="font-bold tracking-tight bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent"
        >
          MLBB Trade Hub
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/sellers" className="text-xs font-semibold text-slate-600 hover:text-cyan-600 transition-colors">
            Verified Dealers
          </Link>
          {/* Notifications */}
          {user && (
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative inline-flex items-center gap-2 rounded-full p-2 hover:bg-slate-100 transition-colors"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5 text-slate-700" />
                  {convos.filter((c) => {
                    // unread if last message exists and was not sent by me, and my side hasn't read it since
                    const lastFromOther = c.lastMessage && c.lastSenderId && c.lastSenderId !== user.id
                    if (!lastFromOther) return false
                    // as buyer -> compare buyerLastReadAt
                    if (c.buyerId === user.id) {
                      const lastTs = new Date(c.updatedAt).getTime() || 0
                      const readTs = c.buyerLastReadAt ? new Date(c.buyerLastReadAt).getTime() : 0
                      return lastTs > readTs
                    }
                    // as seller -> compare sellerLastReadAt
                    if (c.sellerId === user.id) {
                      const lastTs = new Date(c.updatedAt).getTime() || 0
                      const readTs = c.sellerLastReadAt ? new Date(c.sellerLastReadAt).getTime() : 0
                      return lastTs > readTs
                    }
                    return false
                  }).length > 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-semibold text-white">
                        {Math.min(
                          convos.filter((c) => {
                            const lastFromOther = c.lastMessage && c.lastSenderId && c.lastSenderId !== user.id
                            if (!lastFromOther) return false
                            if (c.buyerId === user.id) {
                              const lastTs = new Date(c.updatedAt).getTime() || 0
                              const readTs = c.buyerLastReadAt ? new Date(c.buyerLastReadAt).getTime() : 0
                              return lastTs > readTs
                            }
                            if (c.sellerId === user.id) {
                              const lastTs = new Date(c.updatedAt).getTime() || 0
                              const readTs = c.sellerLastReadAt ? new Date(c.sellerLastReadAt).getTime() : 0
                              return lastTs > readTs
                            }
                            return false
                          }).length,
                          9,
                        )}
                      </span>
                    )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-w-[85vw] border-slate-200 bg-white text-slate-800 shadow-lg rounded-xl">
                {convos.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-500">No conversations yet.</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto pr-1">
                    {convos.map((c) => {
                      const lastFromOther = c.lastMessage && c.lastSenderId && c.lastSenderId !== user.id
                      const lastTs = new Date(c.updatedAt).getTime() || 0
                      const readTs = c.buyerId === user.id
                        ? (c.buyerLastReadAt ? new Date(c.buyerLastReadAt).getTime() : 0)
                        : (c.sellerLastReadAt ? new Date(c.sellerLastReadAt).getTime() : 0)
                      const unread = !!lastFromOther && lastTs > readTs
                      return (
                        <DropdownMenuItem
                          key={c.id}
                          onSelect={(e) => {
                            e.preventDefault()
                            onClickConversation(c)
                          }}
                          className="flex items-start gap-2 whitespace-normal rounded-lg m-1 hover:bg-slate-50"
                        >
                          <div className={"mt-1 h-2 w-2 flex-shrink-0 rounded-full " + (unread ? "bg-cyan-500" : "bg-slate-300")} />
                          <div className="min-w-0">
                            <div className={"truncate text-xs " + (unread ? "font-bold text-slate-900" : "text-slate-600 font-medium")}>
                              {listingTitles[c.listingId] || `Listing ${c.listingId}`}
                            </div>
                            <div className="truncate text-[11px] text-slate-500">From: {c.buyerName || "Buyer"}</div>
                            <div className={"truncate text-[11px] " + (unread ? "text-slate-700" : "text-slate-400")}>{c.lastMessage || "New message"}</div>
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            onClick={() => setWishlistOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-full p-2 hover:bg-slate-100 transition-colors"
            aria-label="Open wishlist"
          >
            <Heart className="h-5 w-5 text-slate-700" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1.5 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>
          {!loading && !user && <LoginDialog />}

          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center gap-2 rounded-full p-1.5 hover:bg-slate-100 transition-colors ml-1")}>
                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                    <AvatarImage
                      src={profile?.photoURL || user.user_metadata?.avatar_url || user.user_metadata?.picture || "/placeholder.svg?height=64&width=64&query=avatar"}
                      alt="Profile avatar"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-800 font-semibold">
                      {initials(profile?.displayName || profile?.fullName, user.email || undefined)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-slate-200 bg-white text-slate-800 shadow-lg rounded-xl">
                <DropdownMenuItem asChild className="hover:bg-slate-50 cursor-pointer m-1 rounded-md">
                  <Link href={`/seller/${user.id}`}>View Profile</Link>
                </DropdownMenuItem>
                {canPost && (
                  <DropdownMenuItem asChild className="hover:bg-slate-50 cursor-pointer m-1 rounded-md">
                    <Link href="/new">New Listing</Link>
                  </DropdownMenuItem>
                )}
                {!canPost && (
                  <DropdownMenuItem asChild className="hover:bg-slate-50 cursor-pointer m-1 rounded-md">
                    <Link href="/sellers">Become a Seller</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem onClick={() => signOut()} className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer m-1 rounded-md">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
      <WishlistSheet open={wishlistOpen} onOpenChange={setWishlistOpen} />
      {/* Chat dialogs controlled from header notifications */}
      {supabaseEnabled && contactOpen && contactListingId && contactSellerId && (
        <ContactSellerDialog
          open={contactOpen}
          onOpenChange={setContactOpen}
          listingId={contactListingId}
          sellerId={contactSellerId}
        />
      )}
      {supabaseEnabled && inboxOpen && inboxListingId && (
        <SellerInboxDialog
          open={inboxOpen}
          onOpenChange={setInboxOpen}
          listingId={inboxListingId}
          initialConversationId={inboxConversationId || undefined}
        />)
      }
    </header>
  )
}

export default function Header() {
  // Ensure AuthProvider wraps header content so avatar/profile is available
  return (
    <AuthProvider>
      <HeaderInner />
    </AuthProvider>
  )
}
