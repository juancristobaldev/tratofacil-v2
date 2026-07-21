import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Card, Button, Badge } from '../ui';
import { usePanel } from '../../context/PanelContext';

interface IncomingRequest {
  id: string;
  clientName: string;
  serviceType: string;
  distance: string;
  price: number;
  address: string;
}

const INCOMING_REQUESTS: IncomingRequest[] = [
  {
    id: 'req201',
    clientName: 'Juan Pérez',
    serviceType: 'Reparación de Enchufe Cocina',
    distance: '1.2 km de distancia',
    price: 22000,
    address: 'Av. Providencia 1450, Depto 402, Providencia',
  },
  {
    id: 'req202',
    clientName: 'María Ignacia',
    serviceType: 'Cortocircuito en Baño',
    distance: '2.5 km de distancia',
    price: 35000,
    address: 'Pedro de Valdivia 900, Providencia',
  },
];

export const ProviderPanelContent: React.FC = () => {
  const navigation = useNavigation<any>();
  const { openPanel } = usePanel();
  const [online, setOnline] = useState(true);
  const [requests, setRequests] = useState<IncomingRequest[]>(INCOMING_REQUESTS);

  const handleAcceptRequest = (reqId: string) => {
    openPanel('focus_provider', { requestId: reqId });
  };

  const handleDeclineRequest = (reqId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Online toggle */}
        <View style={styles.onlineRow}>
          <View style={styles.onlineInfo}>
            <View style={[styles.statusDot, online && styles.statusDotActive]} />
            <Text style={[styles.onlineLabel, online && styles.onlineLabelActive]}>
              {online ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={setOnline}
            trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }}
            thumbColor={online ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
          />
        </View>

        {/* Wallet card */}
        <Card style={styles.walletCard} padded={false}>
          <TouchableOpacity
            style={styles.walletBtn}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.9}
          >
            <View style={styles.walletTextCol}>
              <Text style={styles.walletLabel}>Ganancias de hoy</Text>
              <Text style={styles.walletVal}>$67.000</Text>
              <Text style={styles.walletSub}>3 servicios completados</Text>
            </View>
            <View style={styles.walletIconCircle}>
              <Icon name="ArrowRight" size={18} color={TOKENS.colors.white} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Plan notice */}
        <Card style={styles.planNoticeCard} padded={true}>
          <View style={styles.planNoticeRow}>
            <Icon name="Crown" size={20} color={TOKENS.colors.starActive} />
            <View style={styles.planNoticeText}>
              <Text style={styles.planNoticeTitle}>Plan Profesional Activo</Text>
              <Text style={styles.planNoticeSub}>Tu membresía Bronce vence en 15 días.</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Plans')}>
              <Text style={styles.planNoticeLink}>Ver Planes</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Requests */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>
            Solicitudes en curso ({online ? requests.length : 0})
          </Text>

          {!online ? (
            <View style={styles.offlinePlaceholder}>
              <Icon name="WifiOff" size={48} color={TOKENS.colors.textMuted} />
              <Text style={styles.offlineTextPlaceholder}>Conéctate para recibir solicitudes en tiempo real.</Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.offlinePlaceholder}>
              <Icon name="Clock" size={48} color={TOKENS.colors.textMuted} />
              <Text style={styles.offlineTextPlaceholder}>Esperando nuevas solicitudes...</Text>
            </View>
          ) : (
            requests.map((req) => (
              <Card key={req.id} style={styles.requestCard}>
                <View style={styles.reqHeader}>
                  <View style={styles.reqHeaderMain}>
                    <Text style={styles.reqTitle} numberOfLines={1}>{req.serviceType}</Text>
                    <Text style={styles.reqClient}>{req.clientName}</Text>
                  </View>
                  <Text style={styles.reqPrice}>${req.price.toLocaleString('es-CL')}</Text>
                </View>

                <View style={styles.reqMeta}>
                  <View style={styles.reqMetaItem}>
                    <Icon name="MapPin" size={14} color={TOKENS.colors.textSubtle} />
                    <Text style={styles.reqMetaText}>{req.distance}</Text>
                  </View>
                  <View style={styles.reqMetaItem}>
                    <Icon name="Map" size={14} color={TOKENS.colors.textSubtle} />
                    <Text style={styles.reqMetaText} numberOfLines={1}>{req.address}</Text>
                  </View>
                </View>

                <View style={styles.reqActions}>
                  <Button
                    title="Rechazar"
                    variant="white"
                    onPress={() => handleDeclineRequest(req.id)}
                    style={styles.declineBtn}
                  />
                  <Button
                    title="Aceptar"
                    onPress={() => handleAcceptRequest(req.id)}
                    style={styles.acceptBtn}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollBody: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    gap: TOKENS.spacing.md,
    paddingBottom: 20,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.surface300,
  },
  statusDotActive: {
    backgroundColor: TOKENS.colors.statusSuccess,
  },
  onlineLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  onlineLabelActive: {
    color: TOKENS.colors.statusSuccess,
  },
  walletCard: {
    backgroundColor: TOKENS.colors.dark900,
    borderColor: TOKENS.colors.dark800,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TOKENS.spacing.lg,
    justifyContent: 'space-between',
  },
  walletTextCol: {
    flex: 1,
  },
  walletLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  walletVal: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    marginTop: 4,
  },
  walletSub: {
    color: TOKENS.colors.brand100,
    fontSize: TOKENS.typography.sizes.xxs,
    marginTop: 2,
    fontWeight: '600',
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNoticeCard: {
    backgroundColor: TOKENS.colors.white,
  },
  planNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planNoticeText: {
    flex: 1,
    marginLeft: 10,
  },
  planNoticeTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  planNoticeSub: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  planNoticeLink: {
    color: TOKENS.colors.brand500,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    textDecorationLine: 'underline',
  },
  requestsSection: {
    gap: TOKENS.spacing.md,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  offlinePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  offlineTextPlaceholder: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontWeight: '500',
  },
  requestCard: {
    backgroundColor: TOKENS.colors.white,
    gap: 12,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reqHeaderMain: {
    flex: 1,
    marginRight: 12,
  },
  reqTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  reqClient: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    fontWeight: '500',
  },
  reqPrice: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand600,
  },
  reqMeta: {
    gap: 6,
    paddingVertical: TOKENS.spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.surface100,
  },
  reqMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqMetaText: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    fontWeight: '500',
  },
  reqActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 44,
  },
  acceptBtn: {
    flex: 1,
    height: 44,
  },
});
