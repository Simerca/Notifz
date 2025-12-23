import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import AppsPage from '@/pages/AppsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import AppDetailPage from '@/pages/AppDetailPage';
import SegmentsPage from '@/pages/SegmentsPage';
import UsersPage from '@/pages/UsersPage';
import AnalyticsPage from '@/pages/AnalyticsPage';

export default function App() {
  return (
    <>
      <Layout>
        <Switch>
          <Route path="/" component={AppsPage} />
          <Route path="/apps/:appId" component={AppDetailPage} />
          <Route path="/apps/:appId/notifications" component={NotificationsPage} />
          <Route path="/apps/:appId/segments" component={SegmentsPage} />
          <Route path="/apps/:appId/users" component={UsersPage} />
          <Route path="/apps/:appId/analytics" component={AnalyticsPage} />
          <Route>
            <div className="flex items-center justify-center h-[60vh]">
              <p className="text-muted-foreground text-sm">Page not found</p>
            </div>
          </Route>
        </Switch>
      </Layout>
      <Toaster />
    </>
  );
}
