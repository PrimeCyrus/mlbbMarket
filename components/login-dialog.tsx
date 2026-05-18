"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/components/auth-provider"
import { supabaseEnabled } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function LoginDialog() {
  const { signIn } = useAuth()
  const { toast } = useToast()

  const handleGoogleLogin = async () => {
    if (!supabaseEnabled) {
      toast({
        variant: "destructive",
        title: "Supabase not configured",
        description: "Add NEXT_PUBLIC_SUPABASE_* env vars.",
      })
      return
    }
    try {
      await signIn()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sign-in failed", description: e.message })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="text-xs">
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs border-neutral-800 bg-neutral-950 text-neutral-100">
        <DialogTitle className="text-center">Sign in</DialogTitle>
        <Button onClick={handleGoogleLogin} className="w-full">
          Continue with Google
        </Button>
      </DialogContent>
    </Dialog>
  )
}
