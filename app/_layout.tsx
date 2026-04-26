import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import SnipedAlert from '@/components/SnipedAlert'

interface SnipeAlert {
  photoUrl: string
  sniperName: string
  gameName: string
  gameId: string
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [alert, setAlert] = useState<SnipeAlert | null>(null)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) {
      router.replace('/(auth)')
    } else if (session && inAuth) {
      router.replace('/(app)')
    }
  }, [session, segments])

  // Global snipe alert listener
  useEffect(() => {
    if (!session?.user) return

    const userId = session.user.id

    const channel = supabase
      .channel('global-snipes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'snipes',
        filter: `sniped_id=eq.${userId}`,
      }, async (payload) => {
        const snipe = payload.new as any

        // Fetch sniper name and game name
        const [{ data: sniper }, { data: game }] = await Promise.all([
          supabase.from('profiles').select('display_name').eq('id', snipe.sniper_id).single(),
          supabase.from('games').select('name').eq('id', snipe.game_id).single(),
        ])

        setAlert({
          photoUrl: snipe.photo_url,
          sniperName: sniper?.display_name ?? 'someone',
          gameName: game?.name ?? 'a game',
          gameId: snipe.game_id,
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  if (session === undefined) return null

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {alert && (
        <SnipedAlert
          visible={!!alert}
          photoUrl={alert.photoUrl}
          sniperName={alert.sniperName}
          gameName={alert.gameName}
          gameId={alert.gameId}
          onDismiss={() => setAlert(null)}
        />
      )}
    </>
  )
}
