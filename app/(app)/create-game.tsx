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
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

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

    // Create game
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

    // Add creator as member
    await supabase.from('game_members').insert({ game_id: game.id, user_id: user.id })

    // Look up friends by email and add them
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
          `${emails.length - foundCount} email(s) don't have an account yet. They can join once they sign up.`
        )
      }
    }

    setLoading(false)
    router.replace({ pathname: '/(app)/game/[id]', params: { id: game.id } })
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>new game</Text>

        <Text style={styles.label}>game name</Text>
        <TextInput
          style={styles.input}
          placeholder="backyard war 2025"
          placeholderTextColor="#555"
          value={gameName}
          onChangeText={setGameName}
        />

        <Text style={styles.label}>add friends by email</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="friend@example.com"
            placeholderTextColor="#555"
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
          <View key={e} style={styles.phoneChip}>
            <Text style={styles.phoneChipText}>{e}</Text>
            <TouchableOpacity onPress={() => removeEmail(e)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={createGame}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'creating...' : 'create game'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    color: '#555',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 32,
  },
  label: {
    color: '#555',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addBtn: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  phoneChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  phoneChipText: {
    color: '#fff',
    fontSize: 15,
  },
  removeText: {
    color: '#555',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
})
