"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ListingForm from "@/components/listing-form"
import { useState, useMemo } from "react"
import LoginDialog from "@/components/login-dialog"
import { supabaseEnabled } from "@/lib/supabase"
import SellerApplyDialog from "@/components/seller-apply-dialog"

export default function NewListingPage() {
  const { user, profile } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const canPost = useMemo(
    () => !!profile && (profile.role === "admin" || profile.sellerStatus === "approved"),
    [profile],
  )

  if (!supabaseEnabled) {
    return (
      <Alert className="border-cyan-500/20 bg-cyan-500/5">
        <TriangleAlert className="h-4 w-4 text-cyan-400" />
        <AlertTitle className="text-cyan-300">Connect Supabase</AlertTitle>
        <AlertDescription className="text-cyan-200/80">
          Add your Supabase config to enable creating listings and image uploads.
        </AlertDescription>
      </Alert>
    )
  }

  if (!user) {
    return (
      <>
        <Card className="mx-auto max-w-xl border-neutral-800 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-center">Sign in to post a listing</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={() => setLoginOpen(true)}
              className="border-cyan-500/40 bg-neutral-900 text-cyan-300 hover:bg-neutral-800 hover:text-cyan-200"
            >
              Open sign in
            </Button>
          </CardContent>
        </Card>
        <LoginDialog />
      </>
    )
  }

  if (!canPost) {
    return (
      <>
        <Card className="mx-auto max-w-xl border-neutral-800 bg-neutral-950/60">
          <CardHeader>
            <CardTitle className="text-center">Become a verified seller to post</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {profile?.sellerStatus === "pending" ? (
              <p className="text-sm text-neutral-400">Your seller application is pending review.</p>
            ) : (
              <Button
                onClick={() => setApplyOpen(true)}
                className="border-emerald-500/40 bg-neutral-900 text-emerald-300 hover:bg-neutral-800 hover:text-emerald-200"
              >
                Apply to become a seller
              </Button>
            )}
          </CardContent>
        </Card>
        <SellerApplyDialog open={applyOpen} onOpenChange={setApplyOpen} />
      </>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-neutral-800 bg-neutral-950/60">
        <CardHeader>
          <CardTitle>Create a new listing</CardTitle>
        </CardHeader>
        <CardContent>
          <ListingForm />
        </CardContent>
      </Card>
    </div>
  )
}
