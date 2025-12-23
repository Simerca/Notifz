import type { SDKConfig, UserContext, Notification, SyncResponse, Condition, UserProperties } from '@aspect-music/localnotification-shared';
import * as ExpoNotifications from 'expo-notifications';
import { Platform, AppState, type AppStateStatus } from 'react-native';

interface SegmentInfo {
  id: string;
  name: string;
  rules: Condition[];
}

export class LocalNotificationSDK {
  private config: SDKConfig;
  private userContext: UserContext = {};
  private cachedNotifications: Notification[] = [];
  private cachedSegments: SegmentInfo[] = [];
  private scheduledIds: Map<string, string> = new Map();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastVersion = 0;
  private currentSessionId: string | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  constructor(config: SDKConfig) {
    this.config = {
      syncInterval: 60000,
      trackSessions: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    await this.requestPermissions();
    await this.configureNotifications();
    await this.sync();
    this.startAutoSync();

    if (this.config.trackSessions) {
      this.startSessionTracking();
    }
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

  private startSessionTracking(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    this.startSession();
  }

  private handleAppStateChange(nextState: AppStateStatus): void {
    if (nextState === 'active') {
      this.startSession();
    } else if (nextState === 'background' || nextState === 'inactive') {
      this.endSession();
    }
  }

  private async startSession(): Promise<void> {
    if (!this.userContext.userId || this.currentSessionId) return;

    try {
      const response = await this.sendRequest(`/api/analytics/${this.config.appId}/session`, {
        method: 'POST',
        body: JSON.stringify({
          userId: this.userContext.userId,
          type: 'start',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.sessionId) {
        this.currentSessionId = response.sessionId;
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  private async endSession(): Promise<void> {
    if (!this.userContext.userId || !this.currentSessionId) return;

    try {
      await this.sendRequest(`/api/analytics/${this.config.appId}/session`, {
        method: 'POST',
        body: JSON.stringify({
          userId: this.userContext.userId,
          type: 'end',
          sessionId: this.currentSessionId,
          timestamp: new Date().toISOString(),
        }),
      });

      this.currentSessionId = null;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  private async sendRequest<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await fetch(`${this.config.apiUrl}${path}`, {
      headers,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async setUserContext(context: UserContext): Promise<void> {
    this.userContext = { ...this.userContext, ...context };

    if (context.userId && context.properties) {
      await this.syncUserProperties(context.userId, context.properties as UserProperties);
    }

    await this.scheduleEligibleNotifications();

    if (this.config.trackSessions && context.userId && !this.currentSessionId) {
      this.startSession();
    }
  }

  async updateUserProperties(properties: UserProperties): Promise<void> {
    this.userContext.properties = { ...this.userContext.properties, ...properties };

    if (this.userContext.userId) {
      await this.syncUserProperties(this.userContext.userId, this.userContext.properties as UserProperties);
    }

    await this.scheduleEligibleNotifications();
  }

  private async syncUserProperties(userId: string, properties: UserProperties): Promise<void> {
    try {
      await this.sendRequest(`/api/users/${this.config.appId}`, {
        method: 'POST',
        body: JSON.stringify({ externalId: userId, properties }),
      });
    } catch (error) {
      console.error('Failed to sync user properties:', error);
    }
  }

  async sync(): Promise<SyncResponse> {
    const data = await this.sendRequest<SyncResponse>(`/api/sync/${this.config.appId}`);
    this.cachedNotifications = data.notifications;
    this.cachedSegments = data.segments;
    this.lastVersion = data.version;
    await this.scheduleEligibleNotifications();
    return data;
  }

  async syncDelta(): Promise<SyncResponse> {
    const data = await this.sendRequest<SyncResponse>(
      `/api/sync/${this.config.appId}/delta?since=${this.lastVersion}`
    );

    for (const notification of data.notifications) {
      const index = this.cachedNotifications.findIndex((n) => n.id === notification.id);
      if (index >= 0) {
        this.cachedNotifications[index] = notification;
      } else {
        this.cachedNotifications.push(notification);
      }
    }

    this.cachedSegments = data.segments;
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

  private userMatchesSegment(segmentId: string): boolean {
    const segment = this.cachedSegments.find((s) => s.id === segmentId);
    if (!segment) return false;
    return this.evaluateConditions(segment.rules);
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

      if (notification.segmentId && !this.userMatchesSegment(notification.segmentId)) {
        continue;
      }

      if (notification.conditions && !this.evaluateConditions(notification.conditions)) {
        continue;
      }

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

  getSegments(): SegmentInfo[] {
    return [...this.cachedSegments];
  }

  getScheduledIds(): Map<string, string> {
    return new Map(this.scheduledIds);
  }

  getUserContext(): UserContext {
    return { ...this.userContext };
  }

  async destroy(): Promise<void> {
    this.stopAutoSync();
    await this.endSession();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    await this.cancelAllScheduled();
    this.cachedNotifications = [];
    this.cachedSegments = [];
  }
}

export function createLocalNotificationSDK(config: SDKConfig): LocalNotificationSDK {
  return new LocalNotificationSDK(config);
}
