import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, Image, ActivityIndicator } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon } from '../ui/Icon';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showLogo?: boolean;
  showBell?: boolean;
  isRefreshing?: boolean;
  notificationCount?: number;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onBellPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showMenu = !showBack,
  showLogo = !showBack,
  showBell = true,
  isRefreshing = false,
  notificationCount = 0,
  rightAction,
  style,
  onBackPress,
  onMenuPress,
  onBellPress,
}) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { height: subtitle ? 76 + insets.top : 60 + insets.top, paddingTop: insets.top }, style]}>
      {showMenu && (
        <TouchableOpacity
          onPress={onMenuPress || (() => navigation.dispatch(DrawerActions.toggleDrawer()))}
          style={styles.btn}
          activeOpacity={0.7}
        >
          <Icon name="Menu" size={20} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
      )}

      {showBack && (
        <TouchableOpacity
          onPress={onBackPress || (() => navigation.goBack())}
          style={styles.btn}
          activeOpacity={0.7}
        >
          <Icon name="ArrowLeft" size={20} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
      )}

      <View style={styles.center}>
        {showLogo && (
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        )}
        {title && (
          <View style={styles.titleRow}>
            {isRefreshing && (
              <ActivityIndicator size="small" color={TOKENS.colors.brand500} style={{ marginRight: 6 }} />
            )}
            <Text style={styles.title} numberOfLines={subtitle ? 1 : 2}>
              {title}
            </Text>
          </View>
        )}
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {rightAction || (
          showBell && (
            <TouchableOpacity
              style={styles.btn}
              activeOpacity={0.7}
              onPress={onBellPress}
            >
              <Icon name="Bell" size={20} color={TOKENS.colors.textMain} />
              {notificationCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOKENS.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.md,
    zIndex: 50,
    ...TOKENS.shadows.soft,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surface50,
    position: 'relative',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  title: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginTop: 2,
  },
  rightSection: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
  },
  bellBadgeText: {
    color: TOKENS.colors.white,
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
  },
});
