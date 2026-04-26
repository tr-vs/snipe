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
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { gradientColors, accent, cardBorder, mutedText } from '@/lib/theme'

export default function EmailScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function sendOtp() {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) return

    router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } })
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>snipe.</Text>
        <Text style={styles.subtitle}>enter your email to get started</Text>

        <BlurView intensity={20} tint="dark" style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendOtp}
            disabled={loading || !email.includes('@')}
          >
            <Text style={styles.buttonText}>{loading ? 'sending...' : 'send code'}</Text>
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
  title: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -3,
    marginBottom: 8,
  },
  subtitle: {
    color: mutedText,
    fontSize: 16,
    marginBottom: 32,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: cardBorder,
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
    borderColor: cardBorder,
  },
  button: {
    backgroundColor: accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
