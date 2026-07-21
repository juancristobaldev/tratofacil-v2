import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, Image } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon } from '../ui/Icon';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showLogo?: boolean;
  style?: ViewStyle;
  onBackPress?: () => void;
  onMenuPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showMenu = !showBack,
  showLogo = !showBack,
  style,
  onBackPress,
  onMenuPress,
}) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { height: 60 + insets.top, paddingTop: insets.top }, style]}>
      {showMenu && (
        <TouchableOpacity
          onPress={onMenuPress || (() => navigation.dispatch(DrawerActions.toggleDrawer()))}
          style={styles.btn}
        >
          <Icon name="Menu" size={22} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
      )}

      {showBack && (
        <TouchableOpacity
          onPress={onBackPress || (() => navigation.goBack())}
          style={styles.btn}
        >
          <Icon name="ArrowLeft" size={22} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
      )}

      {showLogo && (
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      )}

      {title && (
        <Text style={styles.title}>{title}</Text>
      )}

      <TouchableOpacity style={styles.btn}>
        <Icon name="Bell" size={22} color={TOKENS.colors.textMain} />
        <View style={styles.bellBadge} />
      </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
    zIndex: 50,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.white,
    position: 'relative',
    ...TOKENS.shadows.soft,
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  title: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    flex: 1,
    textAlign: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.brand500,
  },
});
