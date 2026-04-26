import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { GameMember, Game } from '@/lib/types'

type MemberWithName = GameMember & { display_name: string; phone: string }

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [members, setMembers] = useState<MemberWithName[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchGame = useCallback(async () => {
    const [{ data: gameData }, { data: membersData }] = await Promise.all([
      supabase.from('games').select('*').eq('id', id).single(),
      supabase
        .from('game_members')
        .select('*, profile:profiles(display_name, phone)')
        .eq('game_id', id)
        .order('score', { ascending: false }),
    ])

    if (gameData) setGame(gameData)

    if (membersData) {
      const enriched: MemberWithName[] = membersData.map((m: any) => ({
        ...m,
        display_name: m.profile?.display_name ?? m.profile?.phone ?? 'unknown',
        phone: m.profile?.phone ?? '',
      }))
      setMembers(enriched)
    }

    setLoading(false)
    setRefreshing(false)
  }, [id])

  useEffect(() => {
    fetchGame()

    // Realtime: re-fetch when scores change
    const channel = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'snipes', filter: `game_id=eq.${id}` }, () => {
        fetchGame()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchGame])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← back</Text>
        </TouchableOpacity>
        <Text style={styles.gameName}>{game?.name}</Text>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGame() }} tintColor="#fff" />}
        ListHeaderComponent={<Text style={styles.sectionLabel}>leaderboard</Text>}
        renderItem={({ item, index }) => (
          <View style={[styles.row, index === 0 && styles.firstPlace]}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Text style={styles.name} numberOfLines={1}>{item.display_name}</Text>
            <Text style={styles.score}>{item.score}</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.snipeBtn}
        onPress={() => router.push({ pathname: '/(app)/camera', params: { gameId: id } })}
      >
        <Text style={styles.snipeBtnText}>snipe</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 16,
  },
  back: {
    color: '#555',
    fontSize: 16,
    marginBottom: 12,
  },
  gameName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  sectionLabel: {
    color: '#555',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  firstPlace: {
    borderColor: '#fff',
  },
  rank: {
    color: '#555',
    fontSize: 14,
    width: 32,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  score: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  snipeBtn: {
    margin: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  snipeBtnText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
})
