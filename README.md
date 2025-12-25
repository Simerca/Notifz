# LocalNotification

Remote management SDK for local notifications on React Native apps.

## Architecture

```
packages/
  shared/          # Types and validation schemas
  api/             # Hono + Prisma + SQLite REST API
  admin/           # React + shadcn/ui admin interface
  sdk-react-native/# React Native SDK with expo-notifications
```

## Quick Start

### Install dependencies

```bash
pnpm install
```

### Setup database

```bash
pnpm db:push
```

### Run development servers

```bash
pnpm dev
```

- Admin: http://localhost:3000
- API: http://localhost:3001

## API Endpoints

### Apps

- `GET /api/apps` - List apps
- `GET /api/apps/:id` - Get app
- `POST /api/apps` - Create app
- `PATCH /api/apps/:id` - Update app
- `DELETE /api/apps/:id` - Delete app
- `POST /api/apps/:id/regenerate-key` - Regenerate API key

### Notifications

- `GET /api/notifications?appId=xxx` - List notifications
- `GET /api/notifications/:id` - Get notification
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications/:id` - Update notification
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/:id/toggle` - Toggle enabled
- `POST /api/notifications/:id/duplicate` - Duplicate notification

### Sync (for SDK)

- `GET /api/sync/:appId` - Full sync
- `GET /api/sync/:appId/delta?since=version` - Delta sync

## React Native SDK

### Installation

```bash
npm install @localnotification/sdk-react-native expo-notifications
```

### Provider usage

```tsx
import { LocalNotificationProvider, useLocalNotificationContext } from '@localnotification/sdk-react-native';

function App() {
  return (
    <LocalNotificationProvider
      config={{
        apiUrl: 'https://your-api.com',
        appId: 'your-app-id',
        apiKey: 'lnk_xxx', // optional
        syncInterval: 60000,
      }}
    >
      <YourApp />
    </LocalNotificationProvider>
  );
}

function YourApp() {
  const { notifications, sync, setUserContext, triggerNotification } = useLocalNotificationContext();

  useEffect(() => {
    setUserContext({
      userId: 'user-123',
      locale: 'en',
      properties: {
        isPremium: true,
        loginCount: 5,
      },
    });
  }, []);

  return <View>{/* ... */}</View>;
}
```

### Hook usage

```tsx
import { useLocalNotifications } from '@localnotification/sdk-react-native';

function MyComponent() {
  const { notifications, isInitialized, sync, setUserContext, triggerNotification } = useLocalNotifications({
    apiUrl: 'https://your-api.com',
    appId: 'your-app-id',
  });

  return <View>{/* ... */}</View>;
}
```

## Notification Configuration

### Trigger types

- `immediate` - Show notification immediately
- `scheduled` - Show at specific date/time
- `recurring` - Daily, weekly, or monthly

### Conditions

Target notifications based on user properties:

```json
{
  "conditions": [
    { "field": "isPremium", "operator": "eq", "value": true },
    { "field": "loginCount", "operator": "gte", "value": 5 }
  ]
}
```

### Text interpolation

Use placeholders in title/body:

```json
{
  "title": "Hello {{userId}}!",
  "body": "You have {{loginCount}} logins"
}
```

## License

MIT


