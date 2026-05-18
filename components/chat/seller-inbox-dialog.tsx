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

type Conversation = {
  id: string
  listingId: string
  sellerId: string
  buyerId: string
  buyerName?: string | null
  lastMessage?: string | null
  updatedAt?: any
}

type Message = {
  id: string
  senderId: string
  text: string
  createdAt: any
}

export default function SellerInboxDialog({
  open = false,
  onOpenChange = () => { },
  listingId,
  initialConversationId,
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  listingId: string
  initialConversationId?: string
}) {
  const { user } = useAuth()
  const [convos, setConvos] = React.useState<Conversation[]>([])
  const [selected, setSelected] = React.useState<Conversation | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [text, setText] = React.useState("")
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [mobileThread, setMobileThread] = React.useState(false)
  const [listing, setListing] = React.useState<Listing | null>(null)

  // Fallback cache for buyer names if conversation is missing buyerName
  const [buyerNameMap, setBuyerNameMap] = React.useState<Record<string, string>>({})

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const isSmallScreen = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 767px)").matches

  const initials = (name?: string | null) => {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    const first = parts[0]?.[0] || ""
    const second = parts[1]?.[0] || ""
    return (first + second).toUpperCase() || name[0]?.toUpperCase() || "?"
  }

  const formatTime = (value: any): string => {
    try {
      const d: Date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : new Date(value))
      const now = new Date()
      const sameDay = d.toDateString() === now.toDateString()
      if (!sameDay) return d.toLocaleDateString()
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
    if (!user) return

      // load listing summary
      ; (async () => {
        const { data } = await supabase.from('listings').select('*').eq('id', listingId).single()
        if (data) setListing(data as Listing)
      })()

    const fetchConvos = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('listingId', listingId)
        .eq('sellerId', user.id)
        .order('updatedAt', { ascending: false })

      if (data) {
        setConvos(data as Conversation[])
        if (!selected && data.length > 0) {
          if (initialConversationId) {
            const match = data.find((c: any) => c.id === initialConversationId)
            setSelected(match || data[0] as Conversation)
          } else {
            setSelected(data[0] as Conversation)
          }
        }
      }
    }

    fetchConvos()

    const inboxChannelName = `inbox:${listingId}`
    const existingInbox = supabase.getChannels().find(c => c.topic === `realtime:${inboxChannelName}`)
    if (existingInbox) supabase.removeChannel(existingInbox)

    const channel = supabase.channel(inboxChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `listingId=eq.${listingId}` }, () => {
        fetchConvos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, listingId, user, selected, initialConversationId])

  // Fetch missing buyer names as a fallback
  // Fetch missing buyer names -> Supabase approach
  React.useEffect(() => {
    if (!open) return
    const fetchMissing = async () => {
      const missing = convos.filter((c: Conversation) => !c.buyerName && !buyerNameMap[c.buyerId])
      if (missing.length === 0) return

      const { data } = await supabase.from('users').select('uid, fullName, email').in('uid', missing.map(c => c.buyerId))

      if (data) {
        const updates: Record<string, string> = {}
        data.forEach((u: any) => {
          updates[u.uid] = u.fullName || u.email
        })
        setBuyerNameMap((m) => ({ ...m, ...updates }))

        // Backfill
        missing.forEach(async (c) => {
          if (updates[c.buyerId]) {
            await supabase.from('conversations').update({ buyerName: updates[c.buyerId], updatedAt: new Date().toISOString() }).eq('id', c.id)
          }
        })
      }
    }
    fetchMissing()
  }, [convos, buyerNameMap, open])

  React.useEffect(() => {
    if (!open) return
    if (!selected) {
      setMessages([])
      return
    }

    setLoadingMessages(true)

    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', selected.id).order('createdAt', { ascending: true })
      if (data) setMessages(data as Message[])
      setLoadingMessages(false)
      // mark read
      await supabase.from('conversations').update({ sellerLastReadAt: new Date().toISOString() }).eq('id', selected.id)
    }

    fetchMsgs()

    const msgsChannelName = `msgs:${selected.id}`
    const existingMsgs = supabase.getChannels().find(c => c.topic === `realtime:${msgsChannelName}`)
    if (existingMsgs) supabase.removeChannel(existingMsgs)

    const channel = supabase.channel(msgsChannelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, selected])

  React.useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, open, selected])

  const send = async () => {
    if (!user || !selected || !text.trim()) return

    const msg = {
      conversation_id: selected.id,
      senderId: user.id,
      text: text.trim(),
      createdAt: new Date().toISOString()
    }

    await supabase.from('messages').insert(msg)

    await supabase.from('conversations').update({
      lastMessage: text.trim(),
      lastSenderId: user.id,
      updatedAt: new Date().toISOString()
    }).eq('id', selected.id)

    setText("")
  }

  const buyerLabel = (c: Conversation) => c.buyerName || buyerNameMap[c.buyerId] || c.buyerId

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      send()
    }
  }

  const onSelectConversation = (c: Conversation) => {
    setSelected(c)
    if (isSmallScreen()) setMobileThread(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex flex-col border border-slate-200 bg-slate-50 text-slate-900 shadow-2xl
          /* Mobile fullscreen bottom sheet */
          top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 h-[100dvh] max-w-full rounded-none p-0
          data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300
          /* Desktop centered */
          sm:top-[50%] sm:left-[50%] sm:right-auto sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]
          sm:h-[80vh] sm:max-w-4xl sm:rounded-2xl sm:p-0
          md:h-[85vh] md:max-w-5xl
          lg:max-w-6xl
        "
      >
        <DialogHeader className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {mobileThread && (
              <button
                type="button"
                onClick={() => setMobileThread(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden"
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs">B</div>
            <DialogTitle className="text-sm font-medium">Buyer Messages</DialogTitle>
          </div>
        </DialogHeader>

        {!user ? (
          <div className="m-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Please sign in to view messages.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-3">
            <div className={"border-r border-slate-200 bg-white md:col-span-1 " + (mobileThread ? "hidden md:flex" : "flex") + " min-h-0 flex-col"}>
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversations</div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {convos.length ? (
                  convos.map((c: Conversation) => {
                    const active = selected?.id === c.id
                    const name = buyerLabel(c)
                    return (
                      <button
                        key={c.id}
                        onClick={() => onSelectConversation(c)}
                        className={
                          "group flex w-full items-center gap-3 rounded-none border-b border-slate-100 px-3 py-3 text-left transition " +
                          (active
                            ? "bg-slate-50 text-slate-900"
                            : "bg-transparent text-slate-700 hover:bg-slate-50")
                        }
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-[15px] font-medium text-slate-800">{name}</div>
                            <div className="shrink-0 text-[11px] text-slate-400">{formatTime(c.updatedAt)}</div>
                          </div>
                          <div className="truncate text-[13px] text-slate-500">{c.lastMessage || "No messages yet"}</div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-3 text-center text-sm text-slate-400">No conversations yet.</div>
                )}
              </div>
            </div>

            <div className={"min-h-0 md:col-span-2 " + (mobileThread ? "flex" : "hidden md:flex") + " flex-col"}>
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
                {loadingMessages ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                    ))}
                  </div>
                ) : messages.length ? (
                  messages.map((m: Message) => {
                    const mine = m.senderId === user?.id
                    return (
                      <div key={m.id} className={"flex px-1 " + (mine ? "justify-end" : "justify-start")}>
                        <div
                          className={
                            "max-w-[78%] rounded-2xl px-3 py-2 text-[13px] shadow-sm " +
                            (mine ? "bg-cyan-600 text-white" : "bg-white text-slate-800 border border-slate-100")
                          }
                        >
                          <div className="whitespace-pre-wrap leading-5">{m.text}</div>
                          <div className={"mt-1 text-[10px] text-right " + (mine ? "text-cyan-100" : "text-slate-400")}>{formatTime(m.createdAt)}</div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-sm text-slate-400">Select a conversation to view messages.</div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-slate-200 bg-white px-2 py-2">
                <div className="flex items-center gap-2">
                  <button className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100" title="Emoji" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-3.5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 18a5.5 5.5 0 01-5-3h10a5.5 5.5 0 01-5 3z" />
                    </svg>
                  </button>
                  <button className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100" title="Attach" type="button">
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
                      disabled={!selected}
                    />
                    <Button onClick={send} disabled={!selected || !text.trim()} className="h-9 w-9 shrink-0 rounded-full bg-cyan-500 text-white hover:bg-cyan-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M3.4 20.6L21 13.2c1-.4 1-1.9 0-2.3L3.4 3.4c-1-.4-2 .5-1.7 1.5l2.6 7.1c.1.3.1.6 0 .9l-2.6 7.1c-.3 1 .7 1.9 1.7 1.6zM6.7 13.3l11-1.1-11-1.1 1.7-4.7 9.1 5.8-9.1 5.8-1.7-4.7z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
