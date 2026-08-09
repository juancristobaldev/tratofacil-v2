import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<Record<string, any>>();

export function navigate(name: string, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as any)(name, params);
  }
}
