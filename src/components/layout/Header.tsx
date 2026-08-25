import React from 'react';
import { StyleSheet, View, Text, ViewStyle, Image, ActivityIndicator } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { IconButton } from '../ui/IconButton';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showLogo?: boolean;
  showHelp?: boolean;
  isRefreshing?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onHelpPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showMenu = !showBack,
  showLogo = !showBack,
  showHelp = true,
  isRefreshing = false,
  rightAction,
  style,
  onBackPress,
  onMenuPress,
  onHelpPress,
}) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { height: subtitle ? 76 + insets.top : 60 + insets.top, paddingTop: insets.top }, style]}>
      {showMenu && (
        <IconButton
          icon="Menu"
          size="md"
          variant="surface"
          accessibilityLabel="Abrir menú de navegación"
          onPress={onMenuPress || (() => navigation.dispatch(DrawerActions.toggleDrawer()))}
        />
      )}

      {showBack && (
        <IconButton
          icon="ArrowLeft"
          size="md"
          variant="surface"
          accessibilityLabel="Volver a la pantalla anterior"
          onPress={onBackPress || (() => navigation.goBack())}
        />
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
          showHelp && (
            <IconButton
              icon="HelpCircle"
              size="md"
              variant="surface"
              accessibilityLabel="Centro de ayuda y soporte"
              onPress={onHelpPress || (() => navigation.navigate('Support'))}
            />
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
});

