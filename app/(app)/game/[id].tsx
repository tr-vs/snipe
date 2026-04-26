import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { GameMember, Game, Snipe } from '@/lib/types'
import { gradientColors, accent, cardBorder, mutedText } from '@/lib/theme'

type MemberWithName = GameMember & { display_name: string; email: string }
type SnipeWithName = Snipe & { sniper_name: string; sniped_name: string | null }

const SCREEN_WIDTH = Dimensions.get('window').width

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [members, setMembers] = useState<MemberWithName[]>([])
  const [snipes, setSnipes] = useState<SnipeWithName[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  const fetchGame = useCallback(async () => {
    const [{ data: gameData }, { data: membersData }, { data: snipesData, error: snipesError }] = await Promise.all([
      supabase.from('games').select('*').eq('id', id).single(),
      supabase
        .from('game_members')
        .select('*, profile:profiles(display_name, email)')
        .eq('game_id', id)
        .order('score', { ascending: false }),
      supabase
        .from('snipes')
        .select('*, sniper:profiles!snipes_sniper_id_fkey(display_name, email), sniped:profiles!snipes_sniped_id_fkey(display_name)')
        .eq('game_id', id)
        .order('created_at', { ascending: false })
      ,
    ])

    if (gameData) setGame(gameData)

    if (membersData) {
      setMembers(membersData.map((m: any) => ({
        ...m,
        display_name: m.profile?.display_name ?? m.profile?.email ?? 'unknown',
        email: m.profile?.email ?? '',
      })))
    }

    if (snipesData) {
      setSnipes(snipesData.map((s: any) => ({
        ...s,
        sniper_name: s.sniper?.display_name ?? s.sniper?.email ?? 'unknown',
        sniped_name: s.sniped?.display_name ?? null,
      })))
    }

    setLoading(false)
    setRefreshing(false)
  }, [id])

  useFocusEffect(useCallback(() => { fetchGame() }, [fetchGame]))

  async function deleteGame() {
    Alert.alert('Delete game', 'This will delete the game and all snipes. Are you sure?', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('games').delete().eq('id', id)
          if (error) {
            Alert.alert('Error', error.message)
          } else {
            router.dismissAll()
            router.replace('/(app)')
          }
        },
      },
    ])
  }

  useEffect(() => {

    const channel = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'snipes',
        filter: `game_id=eq.${id}`,
      }, () => {
        fetchGame()
      })
      .subscribe((status) => {
        console.log('realtime status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [fetchGame])

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.center}>
        <ActivityIndicator color="#fff" />
      </LinearGradient>
    )
  }

  type ListItem =
    | { type: 'header' }
    | { type: 'member'; data: MemberWithName; index: number }
    | { type: 'feedHeader' }
    | { type: 'snipe'; data: SnipeWithName }

  const listData: ListItem[] = [
    { type: 'header' },
    ...members.map((m, i) => ({ type: 'member' as const, data: m, index: i })),
    { type: 'feedHeader' },
    ...snipes.map((s) => ({ type: 'snipe' as const, data: s })),
  ]

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item, i) => {
          if (item.type === 'member') return item.data.id
          if (item.type === 'snipe') return item.data.id
          return item.type + i
        }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchGame() }}
            tintColor="#fff"
          />
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.header}>
                <View style={styles.headerRow}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.back}>← back</Text>
                  </TouchableOpacity>
                  {game?.created_by === currentUserId && (
                    <TouchableOpacity onPress={deleteGame}>
                      <Text style={styles.deleteText}>delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.gameName}>{game?.name}</Text>
              </View>
            )
          }

          if (item.type === 'member') {
            return (
              <BlurView intensity={20} tint="dark" style={[styles.row, item.index === 0 && styles.firstPlace]}>
                <Text style={styles.rank}>#{item.index + 1}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.data.display_name}</Text>
                <Text style={styles.score}>{item.data.score}</Text>
              </BlurView>
            )
          }

          if (item.type === 'feedHeader') {
            return <Text style={[styles.sectionLabel, { marginTop: 24 }]}>snipes</Text>
          }

          if (item.type === 'snipe') {
            return (
              <View style={styles.snipeCard}>
                <Image
                  source={{ uri: item.data.photo_url }}
                  style={styles.snipePhoto}
                  resizeMode="cover"
                />
                <View style={styles.snipeMeta}>
                  <Text style={styles.sniperName}>
                    {item.data.sniper_name}
                    {item.data.sniped_name ? <Text style={styles.snipedName}> got {item.data.sniped_name}</Text> : null}
                  </Text>
                  <Text style={styles.snipeTime}>
                    {new Date(item.data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            )
          }

          return null
        }}
      />

      <TouchableOpacity
        style={styles.snipeBtn}
        onPress={() => router.push({ pathname: '/(app)/camera', params: { gameId: id } })}
      >
        <Text style={styles.snipeBtnText}>snipe</Text>
      </TouchableOpacity>
    </LinearGradient>
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
    paddingTop: 64,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  back: {
    color: mutedText,
    fontSize: 16,
  },
  deleteText: {
    color: '#ff4444',
    fontSize: 14,
  },
  gameName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  sectionLabel: {
    color: mutedText,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  firstPlace: {
    borderColor: accent,
  },
  rank: {
    color: mutedText,
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
    color: accent,
    fontSize: 22,
    fontWeight: '900',
  },
  snipeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cardBorder,
  },
  snipePhoto: {
    width: '100%',
    height: SCREEN_WIDTH - 48,
  },
  snipeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sniperName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  snipedName: {
    color: '#555',
    fontWeight: '400',
  },
  snipeTime: {
    color: mutedText,
    fontSize: 13,
  },
  snipeBtn: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    margin: 24,
    backgroundColor: accent,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  snipeBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
})
