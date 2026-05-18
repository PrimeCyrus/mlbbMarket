"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TriangleAlert } from "lucide-react"
import { supabase, supabaseEnabled } from "@/lib/supabase"
import { useAuth } from "./auth-provider"

export default function SellerApplyDialog({
  open = false,
  onOpenChange = () => { },
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = React.useState(profile?.fullName ?? "")
  const [contactNumber, setContactNumber] = React.useState("")
  const [governmentId, setGovernmentId] = React.useState<File | null>(null)
  const [passportPhoto, setPassportPhoto] = React.useState<File | null>(null)
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!supabaseEnabled) return
    if (!user) {
      setError("Please sign in first.")
      return
    }
    if (!fullName.trim() || !contactNumber.trim() || !governmentId || !passportPhoto) {
      setError("Please complete all fields.")
      return
    }
    setSubmitting(true)
    try {
      console.log("Starting submission...")
      const ts = Date.now()
      const basePath = `${user.id}/${ts}`
      const govName = `${basePath}/government-id_${governmentId.name}`
      const passName = `${basePath}/passport_${passportPhoto.name}`

      console.log("Uploading files to storage...")
      // Upload both files in parallel
      const [govResult, passResult] = await Promise.all([
        supabase.storage.from('seller-applications').upload(govName, governmentId),
        supabase.storage.from('seller-applications').upload(passName, passportPhoto),
      ])
      
      console.log("Storage upload results:", { govResult, passResult })
      if (govResult.error) throw new Error(`Gov ID upload failed: ${govResult.error.message}`)
      if (passResult.error) throw new Error(`Passport upload failed: ${passResult.error.message}`)

      const { data: { publicUrl: governmentIdUrl } } = supabase.storage.from('seller-applications').getPublicUrl(govName)
      const { data: { publicUrl: passportPhotoUrl } } = supabase.storage.from('seller-applications').getPublicUrl(passName)

      console.log("Updating database records...")
      // Insert application record and update user status in parallel
      const [appResult, updateResult] = await Promise.all([
        supabase.from('seller_applications').insert({
          user_id: user.id,
          full_name: fullName.trim(),
          contact_number: contactNumber.trim(),
          note: note.trim() || null,
          government_id_url: governmentIdUrl,
          passport_photo_url: passportPhotoUrl,
          status: 'pending',
        }),
        supabase.from('users').update({
          full_name: fullName.trim(),
          seller_status: 'pending',
          updated_at: new Date().toISOString()
        }).eq('uid', user.id)
      ])
      
      console.log("Database update results:", { appResult, updateResult })
      if (appResult.error) throw new Error(`Application insert failed: ${appResult.error.message}`)
      if (updateResult.error) throw new Error(`User update failed: ${updateResult.error.message}`)

      console.log("Refreshing profile...")
      await refreshProfile?.()
      
      console.log("Submission complete!")
      setSuccess("Application submitted. You'll be notified once reviewed.")
      setTimeout(() => onOpenChange(false), 1200)
    } catch (err: any) {
      console.error("Submission error:", err)
      setError(err?.message || "Failed to submit application.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Become a Seller</DialogTitle>
        </DialogHeader>

        {!supabaseEnabled && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-700">
            <TriangleAlert className="h-4 w-4" />
            Add Supabase config to enable submissions.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-slate-200 bg-slate-50 placeholder:text-slate-400"
              disabled={!supabaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="border-slate-200 bg-slate-50 placeholder:text-slate-400"
              disabled={!supabaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="governmentId">Government ID (image)</Label>
            <Input
              id="governmentId"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setGovernmentId((e.target.files && e.target.files[0]) || null)}
              className="border-slate-200 bg-slate-50"
              disabled={!supabaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="passportPhoto">Passport Photo (image)</Label>
            <Input
              id="passportPhoto"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setPassportPhoto((e.target.files && e.target.files[0]) || null)}
              className="border-slate-200 bg-slate-50"
              disabled={!supabaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Anything else the admin should know..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-24 border-slate-200 bg-slate-50 placeholder:text-slate-400"
              disabled={!supabaseEnabled}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <Button
            type="submit"
            disabled={submitting || !supabaseEnabled || !user}
            className="mt-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:from-cyan-600 hover:to-fuchsia-600 shadow-sm"
          >
            {submitting ? "Submitting..." : "Submit application"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
