"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TriangleAlert, Trash2, MessagesSquare, MessageCircle, Check, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatCurrency } from "@/utils/format"
import type { Listing } from "@/types/listing"
import { supabase, supabaseEnabled } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ContactSellerDialog from "@/components/chat/contact-seller-dialog"
import SellerInboxDialog from "@/components/chat/seller-inbox-dialog"
import { useWishlist } from "@/hooks/use-wishlist"

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { add, remove, has } = useWishlist()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)

  useEffect(() => {
    if (!params?.id) return

    const fetchListing = async () => {
      try {
        const { data } = await supabase.from('listings').select('*').eq('id', params.id).single()
        if (data) {
          // Handle potential Postgres text array string format
          let parsedUrls = data.image_urls || []
          if (typeof parsedUrls === 'string') {
            parsedUrls = parsedUrls.replace(/^{|}$/g, '').split(',').map((s: string) => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
          }

          setListing({
            id: data.id,
            title: data.title,
            description: data.description,
            price: data.price,
            imageUrls: parsedUrls,
            userId: data.user_id,
            isGirlsId: data.is_girls_id,
            collectorLevel: data.collector_level,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            soldAt: data.sold_at
          } as Listing)
        } else {
          setListing(null)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchListing()
  }, [params?.id])

  const isOwner = useMemo(() => !!user && !!listing && user.id === listing.userId, [user, listing])
  const isSold = listing?.status === "sold"

  const handleDelete = async () => {
    if (!listing) return
    try {
      // Supabase Storage delete
      const filesToRemove = (listing.imageUrls ?? [])
        .map(url => {
          // extract path from url if needed, or rely on bucket logic
          // typically Supabase Storage URLs are like .../storage/v1/object/public/bucket/path
          const matches = url.match(/\/listings\/(.+)$/)
          return matches ? matches[1] : null
        })
        .filter(Boolean) as string[]

      if (filesToRemove.length) {
        await supabase.storage.from('listings').remove(filesToRemove)
      }

      await supabase.from('listings').delete().eq('id', listing.id)
      router.push("/")
    } catch {
      // no-op
    }
  }

  const markSold = async () => {
    if (!listing) return
    await supabase.from('listings').update({
      status: "sold",
      sold_at: new Date().toISOString()
    }).eq('id', listing.id)

    setListing({ ...(listing as any), status: "sold" })
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-neutral-900/70" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-900/70" />
          <div className="h-4 w-full animate-pulse rounded bg-neutral-900/70" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-900/70" />
          <div className="h-10 w-40 animate-pulse rounded bg-neutral-900/70" />
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <Alert className="border-fuchsia-500/20 bg-fuchsia-500/5">
        <TriangleAlert className="h-4 w-4 text-fuchsia-400" />
        <AlertTitle className="text-fuchsia-300">Listing not found</AlertTitle>
        <AlertDescription className="text-fuchsia-200/80">
          The listing you are looking for does not exist.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-2 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                <img
                  src={listing.imageUrls?.[0] ?? "/placeholder.svg?height=700&width=1200&query=mlbb%20splash%20art"}
                  alt="Listing cover"
                  className="h-full w-full max-h-[520px] object-cover"
                />
              </div>
              {listing.imageUrls && listing.imageUrls.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {listing.imageUrls.slice(1, 4).map((url, idx) => (
                    <img
                      key={idx}
                      src={url || "/placeholder.svg"}
                      alt={"Preview " + (idx + 2)}
                      className="h-28 w-full rounded-md border border-slate-200 object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <h1 className="text-balance text-3xl font-semibold sm:text-4xl">
            <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
              {listing.title}
            </span>
          </h1>
          
          <div className="flex flex-wrap gap-2 pt-1">
            {listing.isGirlsId && (
              <span className="inline-flex items-center rounded-full bg-pink-100 border border-pink-200 px-3 py-1 text-xs font-semibold text-pink-600">
                Girls ID
              </span>
            )}
            {!!listing.collectorLevel && (
              <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                {listing.collectorLevel} Collector
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-emerald-500">{formatCurrency(listing.price)}</div>
          <p className="max-w-prose text-base leading-relaxed text-slate-600">{listing.description}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isSold && (
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                Sold
              </span>
            )}

            {/* Buyer: Contact seller */}
            {!isOwner && supabaseEnabled && !isSold && (
              <Button
                className="border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50 shadow-sm"
                variant="outline"
                onClick={() => setContactOpen(true)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Contact seller
              </Button>
            )}

            {/* Wishlist toggle (available for all viewers) */}
            {!isOwner && (
              <Button
                variant="outline"
                onClick={() => {
                  if (!listing) return
                  if (has(listing.id)) remove(listing.id)
                  else add({ id: listing.id, title: listing.title, price: listing.price, imageUrl: listing.imageUrls?.[0], sellerId: listing.userId })
                }}
                className={"border-pink-200 text-pink-600 shadow-sm transition-colors " + (has(listing.id) ? "bg-pink-50" : "bg-white hover:bg-pink-50")}
              >
                <Heart className="mr-2 h-4 w-4" />
                {has(listing.id) ? "In Wishlist" : "Wishlist"}
              </Button>
            )}

            {/* Seller: manage */}
            {isOwner && supabaseEnabled && (
              <>
                {!isSold && (
                  <Button onClick={markSold} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm border border-emerald-200">
                    <Check className="mr-2 h-4 w-4" />
                    Mark as sold
                  </Button>
                )}
                <Button
                  className="bg-white border-cyan-200 text-cyan-700 hover:bg-cyan-50 shadow-sm"
                  variant="outline"
                  onClick={() => setInboxOpen(true)}
                >
                  <MessagesSquare className="mr-2 h-4 w-4" />
                  Messages
                </Button>
                <Button
                  variant="destructive"
                  className="bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 border border-fuchsia-200 shadow-sm"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete listing
                </Button>
              </>
            )}
          </div>

          {!supabaseEnabled && (
            <Alert className="border-cyan-500/20 bg-cyan-500/5">
              <TriangleAlert className="h-4 w-4 text-cyan-400" />
              <AlertTitle className="text-cyan-300">Demo mode</AlertTitle>
              <AlertDescription className="text-cyan-200/80">
                Connect Supabase to enable chat, deletion and authentication.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-slate-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete this listing?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-slate-500">This will permanently remove the listing and its images.</p>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 border border-fuchsia-200"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat dialogs */}
      {supabaseEnabled && listing && !isOwner && (
        <ContactSellerDialog
          open={contactOpen}
          onOpenChange={setContactOpen}
          listingId={listing.id}
          sellerId={listing.userId}
        />
      )}
      {supabaseEnabled && listing && isOwner && (
        <SellerInboxDialog open={inboxOpen} onOpenChange={setInboxOpen} listingId={listing.id} />
      )}
    </>
  )
}
