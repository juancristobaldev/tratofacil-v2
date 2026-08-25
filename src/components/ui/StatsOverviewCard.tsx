import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

export interface StatItemData {
  label: string;
  value: string | number;
  icon?: IconName;
  iconColor?: string;
}

export interface StatsOverviewCardProps {
  stats: StatItemData[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StatsOverviewCard: React.FC<StatsOverviewCardProps> = ({
  stats,
  style,
  testID,
}) => {
  return (
    <View testID={testID} style={[styles.statsCard, style]}>
      {stats.map((item, index) => {
        const isLast = index === stats.length - 1;
        return (
          <React.Fragment key={index}>
            <View style={styles.statItem}>
              <View style={styles.statScoreRow}>
                <Text style={styles.statScoreText}>{item.value}</Text>
                {item.icon && (
                  <Icon
                    name={item.icon}
                    size={15}
                    color={item.iconColor || TOKENS.colors.starActive}
                  />
                )}
              </View>
              <Text style={styles.statLabelText}>{item.label}</Text>
            </View>
            {!isLast && <View style={styles.statDivider} />}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: TOKENS.geometry.radiusCard,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...TOKENS.shadows.soft,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statScoreText: {
    fontSize: 16,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
  },
  statLabelText: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: TOKENS.colors.surface200,
  },
});
