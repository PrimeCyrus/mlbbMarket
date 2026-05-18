"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { supabase, supabaseEnabled } from "@/lib/supabase"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sellerId: string
  sellerName: string
}

export default function ReviewDialog({ open, onOpenChange, sellerId, sellerName }: Props) {
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!user || !supabaseEnabled) return

    setSubmitting(true)
    try {
      const reviewId = `${sellerId}_${user.id}`

      // Upsert into reviews table
      const { error } = await supabase.from('reviews').upsert({
        id: reviewId,
        seller_id: sellerId,
        reviewer_id: user.id,
        rating,
        comment: comment.trim(),
        created_at: new Date().toISOString()
      })

      if (error) throw error

      onOpenChange(false)
      setComment("")
      setRating(5)
    } catch (error) {
      console.error("Failed to submit review:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-neutral-100">Review {sellerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="p-1 hover:scale-110 transition-transform">
                  <Star
                    className={`h-6 w-6 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-neutral-600"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Comment (optional)</label>
            <Textarea
              placeholder="Share your experience with this seller..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-neutral-700 text-neutral-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
