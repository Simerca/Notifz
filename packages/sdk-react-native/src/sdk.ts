import type { SDKConfig, UserContext, Notification, SyncResponse, Condition } from '@localnotification/shared';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';

export class LocalNotificationSDK {
  private config: SDKConfig;
  private userContext: UserContext = {};
  private cachedNotifications: Notification[] = [];
  private scheduledIds: Map<string, string> = new Map();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastVersion = 0;

  constructor(config: SDKConfig) {
    this.config = {
      syncInterval: 60000,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    await this.requestPermissions();
    await this.configureNotifications();
    await this.sync();
    this.startAutoSync();
  }

  private async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  private async configureNotifications(): Promise<void> {
    await ExpoNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      await ExpoNotifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: ExpoNotifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22c55e',
      });
    }
  }

  setUserContext(context: UserContext): void {
    this.userContext = { ...this.userContext, ...context };
    this.scheduleEligibleNotifications();
  }

  async sync(): Promise<SyncResponse> {
    const url = `${this.config.apiUrl}/api/sync/${this.config.appId}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const data: SyncResponse = await response.json();
    this.cachedNotifications = data.notifications;
    this.lastVersion = data.version;
    await this.scheduleEligibleNotifications();

    return data;
  }

  async syncDelta(): Promise<SyncResponse> {
    const url = `${this.config.apiUrl}/api/sync/${this.config.appId}/delta?since=${this.lastVersion}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Delta sync failed: ${response.statusText}`);
    }

    const data: SyncResponse = await response.json();

    for (const notification of data.notifications) {
      const index = this.cachedNotifications.findIndex((n) => n.id === notification.id);
      if (index >= 0) {
        this.cachedNotifications[index] = notification;
      } else {
        this.cachedNotifications.push(notification);
      }
    }

    this.lastVersion = data.version;
    await this.scheduleEligibleNotifications();

    return data;
  }

  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncDelta().catch(console.error);
    }, this.config.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private evaluateConditions(conditions: Condition[]): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((condition) => {
      const value = this.userContext.properties?.[condition.field];
      if (value === undefined) return false;

      switch (condition.operator) {
        case 'eq':
          return value === condition.value;
        case 'neq':
          return value !== condition.value;
        case 'gt':
          return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
        case 'gte':
          return typeof value === 'number' && typeof condition.value === 'number' && value >= condition.value;
        case 'lt':
          return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
        case 'lte':
          return typeof value === 'number' && typeof condition.value === 'number' && value <= condition.value;
        case 'contains':
          return typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value as string);
        default:
          return false;
      }
    });
  }

  private interpolateText(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (key === 'userId') return this.userContext.userId || '';
      if (key === 'locale') return this.userContext.locale || '';
      return String(this.userContext.properties?.[key] ?? `{{${key}}}`);
    });
  }

  private async scheduleEligibleNotifications(): Promise<void> {
    await this.cancelAllScheduled();

    for (const notification of this.cachedNotifications) {
      if (!notification.enabled) continue;
      if (notification.conditions && !this.evaluateConditions(notification.conditions)) continue;

      await this.scheduleNotification(notification);
    }
  }

  private async scheduleNotification(notification: Notification): Promise<void> {
    const title = this.interpolateText(notification.title);
    const body = this.interpolateText(notification.body);

    const content: ExpoNotifications.NotificationContentInput = {
      title,
      body,
      data: notification.data as Record<string, unknown> | undefined,
      sound: notification.sound ?? 'default',
      badge: notification.badge,
    };

    let trigger: ExpoNotifications.NotificationTriggerInput = null;

    switch (notification.trigger.type) {
      case 'scheduled':
        if (notification.trigger.scheduledAt) {
          const scheduledDate = new Date(notification.trigger.scheduledAt);
          if (scheduledDate > new Date()) {
            trigger = { date: scheduledDate };
          }
        }
        break;

      case 'recurring':
        if (notification.trigger.recurrence) {
          const { interval, time, daysOfWeek, dayOfMonth } = notification.trigger.recurrence;
          const [hours, minutes] = time.split(':').map(Number);

          if (interval === 'daily') {
            trigger = {
              hour: hours,
              minute: minutes,
              repeats: true,
            };
          } else if (interval === 'weekly' && daysOfWeek?.length) {
            trigger = {
              weekday: daysOfWeek[0] + 1,
              hour: hours,
              minute: minutes,
              repeats: true,
            };
          } else if (interval === 'monthly' && dayOfMonth) {
            trigger = {
              day: dayOfMonth,
              hour: hours,
              minute: minutes,
              repeats: true,
            };
          }
        }
        break;

      case 'immediate':
      default:
        break;
    }

    const identifier = await ExpoNotifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    this.scheduledIds.set(notification.id, identifier);
  }

  private async cancelAllScheduled(): Promise<void> {
    for (const identifier of this.scheduledIds.values()) {
      await ExpoNotifications.cancelScheduledNotificationAsync(identifier);
    }
    this.scheduledIds.clear();
  }

  async triggerImmediate(notificationId: string): Promise<void> {
    const notification = this.cachedNotifications.find((n) => n.id === notificationId);
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    const title = this.interpolateText(notification.title);
    const body = this.interpolateText(notification.body);

    await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: notification.data as Record<string, unknown> | undefined,
        sound: notification.sound ?? 'default',
        badge: notification.badge,
      },
      trigger: null,
    });
  }

  getNotifications(): Notification[] {
    return [...this.cachedNotifications];
  }

  getScheduledIds(): Map<string, string> {
    return new Map(this.scheduledIds);
  }

  async destroy(): Promise<void> {
    this.stopAutoSync();
    await this.cancelAllScheduled();
    this.cachedNotifications = [];
  }
}

export function createLocalNotificationSDK(config: SDKConfig): LocalNotificationSDK {
  return new LocalNotificationSDK(config);
}

