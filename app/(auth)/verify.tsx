import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function verify() {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'You need a display name so your friends can see you on the leaderboard.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    setLoading(false)

    if (error) {
      Alert.alert('Invalid code', error.message)
      return
    }

    if (data.user) {
      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', data.user.id)
    }
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f1a', '#0a0a0a']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>verify</Text>
        <Text style={styles.subtitle}>code sent to {email}</Text>

        <BlurView intensity={20} tint="dark" style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="your name (required)"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="number-pad"
            maxLength={8}
            value={code}
            onChangeText={setCode}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={verify}
            disabled={loading || code.length < 6}
          >
            <Text style={styles.buttonText}>{loading ? 'verifying...' : 'verify'}</Text>
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  back: {
    position: 'absolute',
    top: 60,
    left: 0,
  },
  backText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -3,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    marginBottom: 32,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
})
