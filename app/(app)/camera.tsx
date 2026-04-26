import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import { supabase } from '@/lib/supabase'

export default function CameraScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>()
  const [permission, requestPermission] = useCameraPermissions()
  const [uploading, setUploading] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const router = useRouter()

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
    if (!cameraRef.current || uploading) return
    setUploading(true)

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 })
      if (!photo) throw new Error('No photo taken')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Read photo as base64
      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const fileName = `${gameId}/${user.id}/${Date.now()}.jpg`
      const contentType = 'image/jpeg'

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('snipes')
        .upload(fileName, decode(base64), { contentType })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('snipes')
        .getPublicUrl(fileName)

      // Insert snipe record
      const { error: insertError } = await supabase.from('snipes').insert({
        game_id: gameId,
        sniper_id: user.id,
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

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </CameraView>

      <TouchableOpacity
        style={[styles.shutterBtn, uploading && styles.shutterDisabled]}
        onPress={shoot}
        disabled={uploading}
      >
        {uploading
          ? <ActivityIndicator color="#000" />
          : <View style={styles.shutterInner} />
        }
      </TouchableOpacity>
    </View>
  )
}

// Decode base64 to Uint8Array for Supabase upload
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
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
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
