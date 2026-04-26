import { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { accent } from '@/lib/theme'

const SCREEN_WIDTH = Dimensions.get('window').width

type Member = { id: string; display_name: string }

export default function CameraScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>()
  const [permission, requestPermission] = useCameraPermissions()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchMembers() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('game_members')
        .select('user_id, profile:profiles(display_name)')
        .eq('game_id', gameId)

      if (data) {
        setMembers(
          data
            .filter((m: any) => m.user_id !== user?.id)
            .map((m: any) => ({
              id: m.user_id,
              display_name: m.profile?.display_name ?? 'unknown',
            }))
        )
      }
    }
    fetchMembers()
  }, [gameId])

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>camera access needed to snipe</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>allow camera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  async function shoot() {
    if (!cameraRef.current) return
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true })
    if (!photo || !photo.base64) return
    setPhotoUri(photo.uri)
    setPhotoBase64(photo.base64)
  }

  async function submitSnipe() {
    if (!photoBase64 || !selectedId || uploading) return
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileName = `${gameId}/${user.id}/${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('snipes')
        .upload(fileName, decode(photoBase64), { contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('snipes')
        .getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('snipes').insert({
        game_id: gameId,
        sniper_id: user.id,
        sniped_id: selectedId,
        photo_url: publicUrl,
      })

      if (insertError) throw insertError

      Alert.alert('sniped!', 'Your snipe was recorded.', [
        { text: 'nice', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong')
    } finally {
      setUploading(false)
    }
  }

  // Preview + tag screen
  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />

        <View style={styles.tagSheet}>
          <Text style={styles.tagTitle}>who'd you get?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRow}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberChip, selectedId === m.id && styles.memberChipSelected]}
                onPress={() => setSelectedId(m.id)}
              >
                <Text style={[styles.memberChipText, selectedId === m.id && styles.memberChipTextSelected]}>
                  {m.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.tagActions}>
            <TouchableOpacity style={styles.retakeBtn} onPress={() => { setPhotoUri(null); setPhotoBase64(null); setSelectedId(null) }}>
              <Text style={styles.retakeBtnText}>retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!selectedId || uploading) && styles.submitBtnDisabled]}
              onPress={submitSnipe}
              disabled={!selectedId || uploading}
            >
              {uploading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.submitBtnText}>submit</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  // Camera screen
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shutterBtn} onPress={shoot}>
        <View style={styles.shutterInner} />
      </TouchableOpacity>
    </View>
  )
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  preview: {
    ...StyleSheet.absoluteFillObject,
  },
  closeBtn: {
    position: 'absolute',
    top: 64,
    left: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
  },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  tagSheet: {
    width: '100%',
    backgroundColor: 'rgba(10,10,10,0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    gap: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  memberRow: {
    gap: 8,
    paddingVertical: 4,
  },
  memberChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  memberChipSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  memberChipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  memberChipTextSelected: {
    color: '#000',
  },
  tagActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  retakeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  permText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  permBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  permBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
})
