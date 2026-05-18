"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { supabase, supabaseEnabled } from "@/lib/supabase"
import type { UserProfile } from "@/types/user"
import type { User, Session } from "@supabase/supabase-js"

type AuthContextShape = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextShape>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => { },
  signOut: async () => { },
  refreshProfile: async () => { },
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseEnabled) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        syncUserToSupabase(session.user)
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await syncUserToSupabase(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Subscribe to profile changes
  useEffect(() => {
    if (!supabaseEnabled || !user) return

    // Remove any stale channel with this name before subscribing (fixes StrictMode double-mount)
    const channelName = `user-${user.id}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setProfile(mapDbToProfile(payload.new))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const mapDbToProfile = (data: any): UserProfile => ({
    uid: data.uid,
    email: data.email,
    displayName: data.display_name,
    fullName: data.full_name,
    photoURL: data.photo_url,
    role: data.role,
    sellerStatus: data.seller_status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('users').select('*').eq('uid', uid).single()
    if (data) setProfile(mapDbToProfile(data))
  }

  const syncUserToSupabase = async (u: User) => {
    const base = {
      email: u.email || "",
      display_name: u.user_metadata?.full_name || u.user_metadata?.name || "",
      photo_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
      updated_at: new Date().toISOString(),
    }

    // Check if exists
    const { data: existing } = await supabase.from('users').select('uid').eq('uid', u.id).single()

    if (!existing) {
      await supabase.from('users').insert({
        uid: u.id,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || "",
        role: "user",
        seller_status: "not_applied",
        created_at: new Date().toISOString(),
        ...base
      })
    } else {
      await supabase.from('users').update(base).eq('uid', u.id)
    }
  }

  const signIn = async () => {
    if (!supabaseEnabled) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.href : undefined
      }
    })
  }

  const signOutUser = async () => {
    if (!supabaseEnabled) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signOut: signOutUser,
      refreshProfile: async () => {
        if (!user) return
        await fetchProfile(user.id)
      },
    }),
    [user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
