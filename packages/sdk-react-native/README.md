# @aspect-music/localnotification-react-native

React Native SDK for LocalNotification - Remote local notification management with user segmentation and analytics.

## Features

- Remote configuration of local notifications
- User segmentation with custom properties
- Automatic session tracking for analytics
- Support for immediate, scheduled, and recurring notifications
- Text interpolation with user properties
- Expo Notifications integration

## Installation

```bash
npm install @aspect-music/localnotification-react-native
# or
yarn add @aspect-music/localnotification-react-native
# or
pnpm add @aspect-music/localnotification-react-native
```

### Peer Dependencies

```bash
npm install expo-notifications react react-native
```

## Quick Start

### 1. Provider Setup

Wrap your app with `LocalNotificationProvider`:

```tsx
import { LocalNotificationProvider } from '@aspect-music/localnotification-react-native';

export default function App() {
  return (
    <LocalNotificationProvider
      config={{
        apiUrl: 'https://your-api.com',
        appId: 'your-app-id',
        apiKey: 'your-api-key', // optional
        syncInterval: 60000, // sync every 60 seconds
        trackSessions: true, // enable session tracking for analytics
      }}
    >
      <YourApp />
    </LocalNotificationProvider>
  );
}
```

### 2. Using the Context Hook

```tsx
import { useLocalNotificationContext } from '@aspect-music/localnotification-react-native';

function MyComponent() {
  const {
    notifications,
    segments,
    isInitialized,
    isLoading,
    error,
    sync,
    setUserContext,
    updateUserProperties,
    triggerNotification,
  } = useLocalNotificationContext();

  // Set user context with properties for segmentation
  useEffect(() => {
    setUserContext({
      userId: 'user-123',
      locale: 'en',
      timezone: 'America/New_York',
      properties: {
        total_played_games: 25,
        is_premium: true,
        level: 10,
      },
    });
  }, []);

  // Update user properties dynamically
  const handleGameComplete = async () => {
    await updateUserProperties({
      total_played_games: 26,
      last_game_date: new Date().toISOString(),
    });
  };

  return (
    <View>
      <Text>Notifications: {notifications.length}</Text>
      <Button title="Refresh" onPress={sync} disabled={isLoading} />
    </View>
  );
}
```

### 3. Standalone Hook Usage

For simpler use cases without context:

```tsx
import { useLocalNotifications } from '@aspect-music/localnotification-react-native';

function MyComponent() {
  const {
    notifications,
    segments,
    isInitialized,
    isLoading,
    error,
    sync,
    setUserContext,
    updateUserProperties,
    triggerNotification,
  } = useLocalNotifications({
    apiUrl: 'https://your-api.com',
    appId: 'your-app-id',
  });

  // ...
}
```

### 4. Direct SDK Usage

For advanced use cases:

```tsx
import { createLocalNotificationSDK } from '@aspect-music/localnotification-react-native';

const sdk = createLocalNotificationSDK({
  apiUrl: 'https://your-api.com',
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  trackSessions: true,
});

await sdk.initialize();

// Set user context
await sdk.setUserContext({
  userId: 'user-123',
  properties: {
    total_played_games: 25,
    is_premium: true,
  },
});

// Update properties
await sdk.updateUserProperties({
  total_played_games: 26,
});

// Manual sync
await sdk.sync();

// Trigger a notification immediately
await sdk.triggerImmediate('notification-id');

// Get cached data
const notifications = sdk.getNotifications();
const segments = sdk.getSegments();
const userContext = sdk.getUserContext();

// Cleanup
await sdk.destroy();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | `string` | required | Base URL of your LocalNotification API |
| `appId` | `string` | required | Your application ID |
| `apiKey` | `string` | optional | API key for authentication |
| `syncInterval` | `number` | `60000` | Auto-sync interval in milliseconds |
| `trackSessions` | `boolean` | `true` | Enable automatic session tracking |

## User Segmentation

The SDK automatically filters notifications based on user segments defined in the admin panel.

### Setting User Properties

```tsx
// Via context
await setUserContext({
  userId: 'user-123',
  properties: {
    total_played_games: 25,
    is_premium: true,
    country: 'US',
  },
});

// Update specific properties
await updateUserProperties({
  total_played_games: 26,
  last_login: new Date().toISOString(),
});
```

### Segment Rules

Segments are defined in the admin panel with rules like:
- `total_played_games > 20`
- `is_premium = true`
- `country in ["US", "CA", "UK"]`

Notifications attached to a segment will only be shown to matching users.

## Text Interpolation

Notification titles and bodies support dynamic text using `{{property}}` syntax:

```
Title: "Welcome back, {{userId}}!"
Body: "You've played {{total_played_games}} games!"
```

## Session Tracking

When `trackSessions` is enabled, the SDK automatically tracks:
- Session start when app becomes active
- Session end when app goes to background

This data powers the analytics dashboard with:
- DAU/WAU/MAU metrics
- Retention cohorts
- Segment comparison

## Notification Types

### Immediate
Displayed immediately when conditions are met.

### Scheduled
Displayed at a specific date and time.

### Recurring
Displayed on a schedule:
- Daily at a specific time
- Weekly on specific days
- Monthly on a specific day

## TypeScript Support

Full TypeScript support with exported types:

```tsx
import type {
  SDKConfig,
  UserContext,
  Notification,
  UserProperties,
  Condition,
  Trigger,
  Segment,
} from '@aspect-music/localnotification-react-native';
```

## API Reference

### LocalNotificationProvider

| Prop | Type | Description |
|------|------|-------------|
| `config` | `SDKConfig` | SDK configuration |
| `children` | `ReactNode` | Child components |
| `autoInitialize` | `boolean` | Auto-initialize on mount (default: true) |

### useLocalNotificationContext / useLocalNotifications

Returns:
- `notifications: Notification[]` - Cached notifications
- `segments: SegmentInfo[]` - Available segments
- `isInitialized: boolean` - SDK initialization status
- `isLoading: boolean` - Loading state
- `error: Error | null` - Last error
- `sync(): Promise<void>` - Manual sync
- `setUserContext(context): Promise<void>` - Set user context
- `updateUserProperties(props): Promise<void>` - Update user properties
- `triggerNotification(id): Promise<void>` - Trigger notification

### LocalNotificationSDK

Methods:
- `initialize(): Promise<void>`
- `setUserContext(context: UserContext): Promise<void>`
- `updateUserProperties(properties: UserProperties): Promise<void>`
- `sync(): Promise<SyncResponse>`
- `syncDelta(): Promise<SyncResponse>`
- `triggerImmediate(notificationId: string): Promise<void>`
- `getNotifications(): Notification[]`
- `getSegments(): SegmentInfo[]`
- `getUserContext(): UserContext`
- `stopAutoSync(): void`
- `destroy(): Promise<void>`

## License

MIT


