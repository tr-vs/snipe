import { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { accent, mutedText } from '@/lib/theme'

interface SnipedAlertProps {
  visible: boolean
  photoUrl: string
  sniperName: string
  gameName: string
  gameId: string
  onDismiss: () => void
}

const SCREEN_HEIGHT = Dimensions.get('window').height

export default function SnipedAlert({
  visible,
  photoUrl,
  sniperName,
  gameName,
  gameId,
  onDismiss,
}: SnipedAlertProps) {
  const router = useRouter()
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    )
    if (visible) animation.start()
    return () => animation.stop()
  }, [visible])

  function retaliate() {
    onDismiss()
    router.push({ pathname: '/(app)/camera', params: { gameId } })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Full bleed photo */}
        <View style={styles.photoArea}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder} />
          )}

          {/* Sniped badge */}
          <View style={styles.badge}>
            <Animated.View style={[styles.badgeDot, { opacity: pulse }]} />
            <Text style={styles.badgeText}>you got sniped!</Text>
          </View>
        </View>

        {/* Bottom sheet */}
        <View style={styles.sheet}>
          <Text style={styles.sniperLine}>
            <Text style={styles.sniperName}>{sniperName}</Text>
            {' got you'}
          </Text>
          <Text style={styles.meta}>{gameName} · just now</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
              <Text style={styles.dismissText}>dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retaliateBtn} onPress={retaliate}>
              <Text style={styles.retaliateText}>⚡ retaliate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    flexDirection: 'column',
  },
  photoArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#111',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
  },
  badge: {
    position: 'absolute',
    top: 56,
    left: 20,
    backgroundColor: accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  sheet: {
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 6,
    backgroundColor: 'transparent',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
  },
  sniperLine: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sniperName: {
    color: accent,
  },
  meta: {
    color: mutedText,
    fontSize: 13,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  dismissBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: 15,
  },
  retaliateBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retaliateText: {
    color: accent,
    fontWeight: '700',
    fontSize: 15,
  },
})
