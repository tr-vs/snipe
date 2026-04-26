import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Game } from '@/lib/types'
import { gradientColors, accent, cardBorder, mutedText } from '@/lib/theme'

type GameWithScore = Game & { my_score: number; member_count: number }

export default function HomeScreen() {
  const [games, setGames] = useState<GameWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      fetchGames()
    }, [])
  )

  async function fetchGames() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('game_members')
      .select('score, game:games(id, name, status, created_at, created_by)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (error || !data) {
      setLoading(false)
      return
    }

    const gameIds = data.filter((d: any) => d.game).map((d: any) => d.game.id)
    const { data: counts } = await supabase
      .from('game_members')
      .select('game_id')
      .in('game_id', gameIds)

    const countMap: Record<string, number> = {}
    counts?.forEach((c: any) => {
      countMap[c.game_id] = (countMap[c.game_id] || 0) + 1
    })

    const enriched: GameWithScore[] = data.filter((d: any) => d.game).map((d: any) => ({
      ...d.game,
      my_score: d.score,
      member_count: countMap[d.game.id] || 1,
    }))

    setGames(enriched)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>snipe.</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>sign out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : games.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>no active games</Text>
          <Text style={styles.emptySubtext}>create one and add your friends</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(app)/game/[id]', params: { id: item.id } })}
            >
              <BlurView intensity={20} tint="dark" style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.gameName}>{item.name}</Text>
                  <Text style={styles.gameMeta}>{item.member_count} players</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.score}>{item.my_score}</Text>
                  <Text style={styles.scoreLabel}>snipes</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/create-game')}
      >
        <Text style={styles.fabText}>+ new game</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -2,
  },
  signOut: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 24,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cardBorder,
  },
  cardLeft: {
    flex: 1,
  },
  gameName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  gameMeta: {
    color: mutedText,
    fontSize: 13,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'center',
  },
  score: {
    color: accent,
    fontSize: 28,
    fontWeight: '900',
  },
  scoreLabel: {
    color: mutedText,
    fontSize: 11,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtext: {
    color: mutedText,
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    margin: 24,
    backgroundColor: accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
