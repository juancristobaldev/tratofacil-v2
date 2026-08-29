import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Image, TouchableOpacity, Linking, Modal } from 'react-native';
import { ChevronLeft, ChevronRight, MessageCircle, Globe, Sparkles, X, ImageIcon } from 'lucide-react-native';
import { TOKENS } from '../../theme';
import type { HorizontalAd } from '../../hooks/useAds';

interface Props {
  images?: HorizontalAd[];
  transitionDuration?: number;
}

export const RotatingHorizontalAd: React.FC<Props> = ({ images = [], transitionDuration = 6000 }) => {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<HorizontalAd | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (images.length <= 1 || selected) return;
    
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrent((prev) => (prev + 1) % images.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, transitionDuration);

    return () => clearInterval(interval);
  }, [images.length, transitionDuration, selected, fadeAnim]);

  const nextAd = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const prevAd = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  if (!images || images.length === 0) return null;

  const activeAd = images[Math.min(current, images.length - 1)];
  const phone = activeAd.phone || null;
  const link = activeAd.link || null;
  const canOpenDetails = !activeAd.isMarketing && Boolean(activeAd.publisherName || activeAd.info || activeAd.phone || activeAd.link);

  return (
    <View style={styles.wrapper}>
      {selected && (
        <AdModal data={selected} isOpen={!!selected} onClose={() => setSelected(null)} />
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => canOpenDetails && setSelected(activeAd)}
        style={styles.container}
      >
        {activeAd.imageUrl ? (
          <View style={StyleSheet.absoluteFill}>
            <Image
              source={{ uri: activeAd.imageUrl }}
              style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
              blurRadius={20}
            />
            <Animated.Image
              source={{ uri: activeAd.imageUrl }}
              style={[StyleSheet.absoluteFill, { opacity: fadeAnim, resizeMode: 'contain' }]}
            />
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: TOKENS.colors.surface100 }]} />
        )}

        {canOpenDetails && (
          <View style={styles.gradientOverlay} />
        )}

        {(activeAd.isMarketing || activeAd.publisherName) && (
          <View style={styles.topBadgesContainer}>
            {activeAd.isMarketing && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>PUBLICIDAD</Text>
              </View>
            )}
            <View style={styles.tratoDirectoBadge}>
              <Sparkles size={14} color={TOKENS.colors.textSubtle} />
              <Text style={styles.tratoDirectoText}>TratoDirecto</Text>
            </View>
          </View>
        )}

        {canOpenDetails && (
          <View style={styles.bottomContent}>
            <View style={styles.infoContainer}>
              <Text style={styles.userName} numberOfLines={1}>{activeAd.publisherName}</Text>
              {activeAd.info && (
                <Text style={styles.userInfo} numberOfLines={1}>{activeAd.info}</Text>
              )}
            </View>

            <View style={styles.actionsContainer}>
              {phone && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    Linking.openURL(`https://wa.me/${phone.replace(/\\+/g, "")}`);
                  }}
                >
                  <MessageCircle size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
              {link && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    Linking.openURL(link.startsWith('http') ? link : `https://${link}`);
                  }}
                >
                  <Globe size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {images.length > 1 && (
          <>
            <TouchableOpacity style={styles.navLeft} onPress={prevAd}>
              <ChevronLeft size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navRight} onPress={nextAd}>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {images.length > 1 && (
          <View style={styles.indicatorContainer}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === current ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const AdModal = ({ isOpen = false, onClose = () => {}, data = null }: { isOpen?: boolean; onClose?: () => void; data?: HorizontalAd | null }) => {
  if (!isOpen) return null;

  const activeAd = data;

  if (!activeAd || (!activeAd.publisherName && !activeAd.info && !activeAd.phone && !activeAd.link)) {
    return (
      <Modal transparent visible={isOpen} onRequestClose={onClose} animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.errorText}>No se encontró información del anuncio.</Text>
            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
              <Text style={modalStyles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const publisherName = activeAd.publisherName || "Usuario Anónimo";
  const adImageUrl = activeAd.imageUrl;
  const whatsappLink = activeAd.phone ? `https://wa.me/${activeAd.phone.replace(/\\+/g, "")}` : null;
  const externalLink = activeAd.link ? (activeAd.link.startsWith("http") ? activeAd.link : `https://${activeAd.link}`) : null;

  return (
    <Modal transparent visible={isOpen} onRequestClose={onClose} animationType="slide">
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={modalStyles.contentWrapper}>
          <TouchableOpacity style={modalStyles.floatingClose} onPress={onClose}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
          
          <View style={modalStyles.imageArea}>
            {adImageUrl ? (
              <>
                <Image source={{ uri: adImageUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} blurRadius={20} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                <Image source={{ uri: adImageUrl }} style={modalStyles.mainImage} resizeMode="contain" />
              </>
            ) : (
              <View style={modalStyles.noImage}>
                <ImageIcon size={48} color="#94a3b8" />
                <Text style={modalStyles.noImageText}>Sin imagen</Text>
              </View>
            )}
          </View>

          <View style={modalStyles.textArea}>
            <Text style={modalStyles.title}>
              {activeAd.serviceName || "Servicio Destacado"}
            </Text>
            <View style={modalStyles.publisherRow}>
              <View style={modalStyles.blueDot} />
              <Text style={modalStyles.publisherText}>Publicado por: <Text style={modalStyles.publisherBold}>{publisherName}</Text></Text>
            </View>
            <Text style={modalStyles.infoText}>
              {activeAd.info || "Este anuncio no tiene descripción adicional detallada."}
            </Text>

            <View style={modalStyles.buttonsRow}>
              {whatsappLink && (
                <TouchableOpacity
                  style={[modalStyles.actionBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => Linking.openURL(whatsappLink)}
                >
                  <MessageCircle size={18} color="#fff" />
                  <Text style={modalStyles.actionBtnText}>Contactar</Text>
                </TouchableOpacity>
              )}
              {externalLink && (
                <TouchableOpacity
                  style={[modalStyles.actionBtn, { backgroundColor: '#0f172a' }]}
                  onPress={() => Linking.openURL(externalLink)}
                >
                  <Globe size={18} color="#fff" />
                  <Text style={modalStyles.actionBtnText}>Visitar</Text>
                </TouchableOpacity>
              )}
              {!whatsappLink && !externalLink && (
                <TouchableOpacity style={[modalStyles.actionBtn, { backgroundColor: '#f1f5f9' }]} onPress={onClose}>
                  <Text style={[modalStyles.actionBtnText, { color: '#334155' }]}>Cerrar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
  },
  container: {
    width: '100%',
    aspectRatio: 16 / 7.5,
    minHeight: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBadgesContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: TOKENS.colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tratoDirectoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  tratoDirectoText: {
    color: TOKENS.colors.textMain,
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    color: TOKENS.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userInfo: {
    color: TOKENS.colors.surface200,
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: TOKENS.colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  navLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 16,
    backgroundColor: TOKENS.colors.white,
    shadowColor: TOKENS.colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: TOKENS.colors.white,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  errorText: {
    color: TOKENS.colors.textSubtle,
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: TOKENS.colors.textMain,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: TOKENS.colors.white,
    fontWeight: 'bold',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    overflow: 'hidden',
  },
  floatingClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  imageArea: {
    width: '100%',
    height: 220,
    backgroundColor: TOKENS.colors.textMain,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    opacity: 0.7,
  },
  noImageText: {
    color: TOKENS.colors.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  textArea: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TOKENS.colors.textMain,
    marginBottom: 12,
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.brand500,
  },
  publisherText: {
    fontSize: 13,
    color: TOKENS.colors.textSubtle,
  },
  publisherBold: {
    fontWeight: 'bold',
    color: TOKENS.colors.textMain,
  },
  infoText: {
    fontSize: 14,
    color: TOKENS.colors.textSubtle,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: TOKENS.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
