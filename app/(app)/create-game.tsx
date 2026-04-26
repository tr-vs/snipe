import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { gradientColors, accent, cardBorder, mutedText } from '@/lib/theme'

export default function CreateGameScreen() {
  const [gameName, setGameName] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function addEmail() {
    const trimmed = emailInput.trim().toLowerCase()
    if (!trimmed.includes('@')) return
    if (emails.includes(trimmed)) return
    setEmails([...emails, trimmed])
    setEmailInput('')
  }

  function removeEmail(email: string) {
    setEmails(emails.filter((e) => e !== email))
  }

  async function createGame() {
    if (!gameName.trim()) {
      Alert.alert('Name required', 'Give your game a name.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({ name: gameName.trim(), created_by: user.id })
      .select()
      .single()

    if (gameError || !game) {
      Alert.alert('Error', gameError?.message ?? 'Could not create game')
      setLoading(false)
      return
    }

    await supabase.from('game_members').insert({ game_id: game.id, user_id: user.id })

    if (emails.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('email', emails)

      if (profiles && profiles.length > 0) {
        await supabase.from('game_members').insert(
          profiles.map((p: { id: string }) => ({ game_id: game.id, user_id: p.id }))
        )
      }

      const foundCount = profiles?.length ?? 0
      if (foundCount < emails.length) {
        Alert.alert(
          'Some friends not found',
          `${emails.length - foundCount} email(s) don't have an account yet.`
        )
      }
    }

    setLoading(false)
    router.replace({ pathname: '/(app)/game/[id]', params: { id: game.id } })
  }

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>new game</Text>

          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.label}>game name</Text>
            <TextInput
              style={styles.input}
              placeholder="backyard war 2025"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={gameName}
              onChangeText={setGameName}
            />

            <Text style={[styles.label, { marginTop: 8 }]}>add friends by email</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="friend@example.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailInput}
                onChangeText={setEmailInput}
                onSubmitEditing={addEmail}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addEmail}>
                <Text style={styles.addBtnText}>add</Text>
              </TouchableOpacity>
            </View>

            {emails.map((e) => (
              <View key={e} style={styles.chip}>
                <Text style={styles.chipText}>{e}</Text>
                <TouchableOpacity onPress={() => removeEmail(e)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </BlurView>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={createGame}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'creating...' : 'create game'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  back: {
    marginBottom: 24,
  },
  backText: {
    color: mutedText,
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: cardBorder,
    gap: 10,
  },
  label: {
    color: mutedText,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: cardBorder,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
  },
  removeText: {
    color: mutedText,
    fontSize: 15,
  },
  button: {
    backgroundColor: accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
