import { useEffect, useState, useCallback } from 'react';
import type { SDKConfig, UserContext, Notification, UserProperties } from '@aspect-music/localnotification-shared';
import { LocalNotificationSDK } from './sdk';

interface SegmentInfo {
  id: string;
  name: string;
  rules: { field: string; operator: string; value: unknown }[];
}

interface UseLocalNotificationsResult {
  notifications: Notification[];
  segments: SegmentInfo[];
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  sync: () => Promise<void>;
  setUserContext: (context: UserContext) => Promise<void>;
  updateUserProperties: (properties: UserProperties) => Promise<void>;
  triggerNotification: (id: string) => Promise<void>;
}

export function useLocalNotifications(config: SDKConfig): UseLocalNotificationsResult {
  const [sdk] = useState(() => new LocalNotificationSDK(config));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    sdk
      .initialize()
      .then(() => {
        setNotifications(sdk.getNotifications());
        setSegments(sdk.getSegments());
        setIsInitialized(true);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      sdk.destroy();
    };
  }, [sdk]);

  const sync = useCallback(async () => {
    setIsLoading(true);
    try {
      await sdk.sync();
      setNotifications(sdk.getNotifications());
      setSegments(sdk.getSegments());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  const setUserContext = useCallback(
    async (context: UserContext) => {
      await sdk.setUserContext(context);
      setNotifications(sdk.getNotifications());
    },
    [sdk]
  );

  const updateUserProperties = useCallback(
    async (properties: UserProperties) => {
      await sdk.updateUserProperties(properties);
      setNotifications(sdk.getNotifications());
    },
    [sdk]
  );

  const triggerNotification = useCallback(
    async (id: string) => {
      await sdk.triggerImmediate(id);
    },
    [sdk]
  );

  return {
    notifications,
    segments,
    isInitialized,
    isLoading,
    error,
    sync,
    setUserContext,
    updateUserProperties,
    triggerNotification,
  };
}
