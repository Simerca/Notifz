import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { SDKConfig, UserContext, Notification, UserProperties, SegmentInfo } from './types';
import { LocalNotificationSDK } from './sdk';

interface LocalNotificationContextValue {
  sdk: LocalNotificationSDK | null;
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

const LocalNotificationContext = createContext<LocalNotificationContextValue | null>(null);

interface ProviderProps {
  config: SDKConfig;
  children: React.ReactNode;
  autoInitialize?: boolean;
}

export function LocalNotificationProvider({ config, children, autoInitialize = true }: ProviderProps) {
  const [sdk] = useState(() => new LocalNotificationSDK(config));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoInitialize) return;

    setIsLoading(true);
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
  }, [sdk, autoInitialize]);

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

  const value = useMemo<LocalNotificationContextValue>(
    () => ({
      sdk,
      notifications,
      segments,
      isInitialized,
      isLoading,
      error,
      sync,
      setUserContext,
      updateUserProperties,
      triggerNotification,
    }),
    [sdk, notifications, segments, isInitialized, isLoading, error, sync, setUserContext, updateUserProperties, triggerNotification]
  );

  return <LocalNotificationContext.Provider value={value}>{children}</LocalNotificationContext.Provider>;
}

export function useLocalNotificationContext(): LocalNotificationContextValue {
  const context = useContext(LocalNotificationContext);
  if (!context) {
    throw new Error('useLocalNotificationContext must be used within LocalNotificationProvider');
  }
  return context;
}
