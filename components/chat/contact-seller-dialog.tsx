"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import type { Listing } from "@/types/listing"
import { formatCurrency } from "@/utils/format"
import Link from "next/link"

type Message = {
  id: string
  senderId: string
  text: string
  createdAt: any
}

export default function ContactSellerDialog({
  open = false,
  onOpenChange = () => { },
  listingId,
  sellerId,
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  listingId: string
  sellerId: string
}) {
  const { user, profile } = useAuth()
  const [text, setText] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [listing, setListing] = React.useState<Listing | null>(null)

  const buyerName = React.useMemo(
    () => profile?.fullName || profile?.displayName || user?.user_metadata?.full_name || user?.email || "Buyer",
    [profile, user],
  )

  const convoId = React.useMemo(() => {
    if (!user) return null
    return `${listingId}_${user.id}`
  }, [listingId, user])

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const formatTime = (value: any): string => {
    try {
      const d: Date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : new Date(value))
      const hours = d.getHours()
      const minutes = d.getMinutes().toString().padStart(2, "0")
      const ampm = hours >= 12 ? "PM" : "AM"
      const hr12 = hours % 12 || 12
      return `${hr12}:${minutes} ${ampm}`
    } catch {
      return ""
    }
  }

  React.useEffect(() => {
    if (!open) return
    if (!user || !convoId) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      // Fetch listing
      const { data: ls } = await supabase.from('listings').select('*').eq('id', listingId).single()
      if (ls) setListing(ls as Listing)

      // Check conversation
      const { data: cData } = await supabase.from('conversations').select('*').eq('id', convoId).single()

      if (!cData) {
        // Create conversation if not exists
        await supabase.from('conversations').insert({
          id: convoId,
          listingId,
          buyerId: user.id,
          buyerName,
          sellerId,
          lastMessage: null,
          updatedAt: new Date().toISOString()
        })
      } else if (!cData.buyerName && buyerName) {
        await supabase.from('conversations').update({ buyerName, updatedAt: new Date().toISOString() }).eq('id', convoId)
      }

      // Fetch messages
      const fetchMessages = async () => {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convoId)
          .order('createdAt', { ascending: true })
        if (msgs) setMessages(msgs as Message[])
        setLoading(false)

        // Mark read
        await supabase.from('conversations').update({ buyerLastReadAt: new Date().toISOString() }).eq('id', convoId)
      }

      fetchMessages()

      // Subscribe to messages
      const convoChannelName = `convo:${convoId}`
      const existingConvo = supabase.getChannels().find(c => c.topic === `realtime:${convoChannelName}`)
      if (existingConvo) supabase.removeChannel(existingConvo)

      const channel = supabase.channel(convoChannelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convoId}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    let cleanup: (() => void) | undefined

    loadData().then((fn) => { cleanup = fn })

    return () => {
      if (cleanup) cleanup()
    }
  }, [open, convoId, listingId, sellerId, user, buyerName])

  // Simplified insert for send
  const send = async () => {
    if (!user || !convoId || !text.trim()) return

    const msg = {
      conversation_id: convoId,
      senderId: user.id,
      text: text.trim(),
      createdAt: new Date().toISOString()
    }

    const { error } = await supabase.from('messages').insert(msg)
    if (error) {
      console.error("Send failed", error)
      return
    }

    await supabase.from('conversations').update({
      buyerName,
      lastMessage: text.trim(),
      lastSenderId: user.id,
      updatedAt: new Date().toISOString()
    }).eq('id', convoId)

    setText("")
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      send()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex flex-col border border-slate-200 bg-slate-50 text-slate-900 shadow-2xl
          /* Mobile: fullscreen bottom sheet */
          top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 h-[100dvh] max-w-full rounded-none p-0
          data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300
          /* Desktop: centered modal */
          sm:top-[50%] sm:left-[50%] sm:right-auto sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]
          sm:h-[70vh] sm:max-w-2xl sm:rounded-2xl sm:p-0
        "
      >
        <DialogHeader className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs">S</div>
            <DialogTitle className="text-sm font-medium">Chat with Seller</DialogTitle>
          </div>
        </DialogHeader>

        {!user ? (
          <div className="m-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Please sign in to message the seller.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4"
            >
              {listing && (
                <Link
                  href={`/listing/${listing.id}`}
                  className="mb-2 block rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={listing.imageUrls?.[0] || "/placeholder.svg?height=64&width=64"}
                      alt="listing"
                      className="flex-shrink-0 rounded object-cover h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base sm:text-lg font-medium text-slate-800">{listing.title}</div>
                      <div className="truncate text-xs sm:text-sm text-slate-500">{listing.description}</div>
                      <div className="text-sm sm:text-base font-semibold text-emerald-600">{formatCurrency(listing.price)}</div>
                    </div>
                  </div>
                </Link>
              )}
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                  ))}
                </div>
              ) : messages.length ? (
                messages.map((m: Message) => {
                  const mine = m.senderId === user.id
                  return (
                    <div key={m.id} className={"flex px-1 " + (mine ? "justify-end" : "justify-start")}>
                      <div
                        className={
                          "group max-w-[78%] rounded-2xl px-3 py-2 text-[13px] shadow-sm " +
                          (mine
                            ? "bg-cyan-600 text-white"
                            : "bg-white text-slate-800 border border-slate-100")
                        }
                      >
                        <div className="whitespace-pre-wrap leading-5">{m.text}</div>
                        <div className={"mt-1 text-[10px] text-right " + (mine ? "text-cyan-100" : "text-slate-400")}>{formatTime(m.createdAt)}</div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-sm text-neutral-400">No messages yet. Say hi!</div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-200 bg-white px-2 py-2">
              <div className="flex items-center gap-2">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                  title="Emoji"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-3.5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 18a5.5 5.5 0 01-5-3h10a5.5 5.5 0 01-5 3z" />
                  </svg>
                </button>
                <button
                  className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                  title="Attach"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M16.5 6.5l-6.8 6.8a3 3 0 104.2 4.2l7.4-7.4a5 5 0 10-7.1-7.1L5.8 11.4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="flex w-full items-center gap-2 rounded-full bg-slate-100 px-3 border border-slate-200">
                  <Input
                    placeholder="Type a message"
                    value={text}
                    onChange={onInputChange}
                    onKeyDown={onInputKeyDown}
                    className="h-10 flex-1 border-none bg-transparent text-sm placeholder:text-slate-500 focus-visible:ring-0 text-slate-900 shadow-none"
                  />
                  <Button
                    onClick={send}
                    disabled={!text.trim()}
                    className="h-9 w-9 shrink-0 rounded-full bg-cyan-500 text-white hover:bg-cyan-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M3.4 20.6L21 13.2c1-.4 1-1.9 0-2.3L3.4 3.4c-1-.4-2 .5-1.7 1.5l2.6 7.1c.1.3.1.6 0 .9l-2.6 7.1c-.3 1 .7 1.9 1.7 1.6zM6.7 13.3l11-1.1-11-1.1 1.7-4.7 9.1 5.8-9.1 5.8-1.7-4.7z" />
                    </svg>
                  </Button>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-200"
                    title="Voice"
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm-7-3a7 7 0 0014 0h-2a5 5 0 11-10 0H5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
