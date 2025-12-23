import { useEffect, useState, useCallback } from 'react';
import type { SDKConfig, UserContext, Notification } from '@localnotification/shared';
import { LocalNotificationSDK } from './sdk';

interface UseLocalNotificationsResult {
  notifications: Notification[];
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  sync: () => Promise<void>;
  setUserContext: (context: UserContext) => void;
  triggerNotification: (id: string) => Promise<void>;
}

export function useLocalNotifications(config: SDKConfig): UseLocalNotificationsResult {
  const [sdk] = useState(() => new LocalNotificationSDK(config));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    sdk
      .initialize()
      .then(() => {
        setNotifications(sdk.getNotifications());
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  const setUserContext = useCallback(
    (context: UserContext) => {
      sdk.setUserContext(context);
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
    isInitialized,
    isLoading,
    error,
    sync,
    setUserContext,
    triggerNotification,
  };
}

