import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import AppsPage from '@/pages/AppsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import AppDetailPage from '@/pages/AppDetailPage';

export default function App() {
  return (
    <>
      <Layout>
        <Switch>
          <Route path="/" component={AppsPage} />
          <Route path="/apps/:appId" component={AppDetailPage} />
          <Route path="/apps/:appId/notifications" component={NotificationsPage} />
          <Route>
            <div className="flex items-center justify-center h-[60vh]">
              <p className="text-muted-foreground">Page not found</p>
            </div>
          </Route>
        </Switch>
      </Layout>
      <Toaster />
    </>
  );
}

