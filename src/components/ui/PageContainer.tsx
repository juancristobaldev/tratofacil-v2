import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, useWindowDimensions } from 'react-native';
import { TOKENS } from '../../theme';

export interface PageContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  maxWidth?: number;
}

/**
 * Responsive Page Container for TratoFácil React Native.
 * Prevents UI from stretching awkwardly on tablets and iPads by constraining maxWidth (default 840)
 * and centering content while preserving full-width on mobile phones.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  style,
  contentStyle,
  padded = true,
  maxWidth = 840,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={[styles.root, style]}>
      <View
        style={[
          styles.inner,
          padded && styles.padded,
          isTablet && { maxWidth, width: '100%', alignSelf: 'center' },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
  padded: {
    paddingHorizontal: TOKENS.spacing.md,
  },
});

export default PageContainer;
