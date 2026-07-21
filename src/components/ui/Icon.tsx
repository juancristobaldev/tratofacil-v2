import React from 'react';
import * as LucideIcons from 'lucide-react-native';

export type IconName = keyof typeof LucideIcons;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  fill?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#1a1a1d', fill = 'none', style }) => {
  const IconComponent = LucideIcons[name] as React.ComponentType<any>;
  if (!IconComponent) {
    // Fallback if icon name doesn't exist in Lucide
    const DefaultIcon = LucideIcons.Wrench as React.ComponentType<any>;
    return <DefaultIcon size={size} color={color} fill={fill} style={style} />;
  }
  return <IconComponent size={size} color={color} fill={fill} style={style} />;
};
