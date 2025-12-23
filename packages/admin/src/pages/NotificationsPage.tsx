import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Plus, MoreVertical, Copy, Trash2, ChevronLeft, Calendar, Clock, Repeat, Zap } from 'lucide-react';
import type { Notification, Trigger } from '@localnotification/shared';
import { api, type App } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface NotificationFormData {
  name: string;
  title: string;
  body: string;
  triggerType: 'immediate' | 'scheduled' | 'recurring';
  scheduledAt: string;
  recurrenceInterval: 'daily' | 'weekly' | 'monthly';
  recurrenceTime: string;
  priority: 'low' | 'default' | 'high';
  enabled: boolean;
}

const defaultFormData: NotificationFormData = {
  name: '',
  title: '',
  body: '',
  triggerType: 'immediate',
  scheduledAt: '',
  recurrenceInterval: 'daily',
  recurrenceTime: '09:00',
  priority: 'default',
  enabled: true,
};

function formatTrigger(trigger: Trigger): string {
  switch (trigger.type) {
    case 'immediate':
      return 'Immediate';
    case 'scheduled':
      return trigger.scheduledAt ? new Date(trigger.scheduledAt).toLocaleString() : 'Scheduled';
    case 'recurring':
      if (trigger.recurrence) {
        return `${trigger.recurrence.interval} at ${trigger.recurrence.time}`;
      }
      return 'Recurring';
    default:
      return 'Unknown';
  }
}

function getTriggerIcon(type: string) {
  switch (type) {
    case 'immediate':
      return Zap;
    case 'scheduled':
      return Calendar;
    case 'recurring':
      return Repeat;
    default:
      return Clock;
  }
}

export default function NotificationsPage() {
  const params = useParams<{ appId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState<NotificationFormData>(defaultFormData);

  const { data: app } = useQuery({
    queryKey: ['apps', params.appId],
    queryFn: () => api.apps.get(params.appId!),
    enabled: !!params.appId,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', params.appId],
    queryFn: () => api.notifications.list(params.appId),
    enabled: !!params.appId,
  });

  const createMutation = useMutation({
    mutationFn: api.notifications.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', params.appId] });
      handleCloseDialog();
      toast({ title: 'Notification created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.notifications.update>[1] }) => api.notifications.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', params.appId] });
      handleCloseDialog();
      toast({ title: 'Notification updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.notifications.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', params.appId] });
      setDeleteNotification(null);
      toast({ title: 'Notification deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: api.notifications.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', params.appId] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: api.notifications.duplicate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', params.appId] });
      toast({ title: 'Notification duplicated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenCreate = () => {
    setEditingNotification(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      name: notification.name,
      title: notification.title,
      body: notification.body,
      triggerType: notification.trigger.type,
      scheduledAt: notification.trigger.scheduledAt || '',
      recurrenceInterval: notification.trigger.recurrence?.interval || 'daily',
      recurrenceTime: notification.trigger.recurrence?.time || '09:00',
      priority: notification.priority,
      enabled: notification.enabled,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNotification(null);
    setFormData(defaultFormData);
  };

  const buildTrigger = (): Trigger => {
    switch (formData.triggerType) {
      case 'scheduled':
        return {
          type: 'scheduled',
          scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
        };
      case 'recurring':
        return {
          type: 'recurring',
          recurrence: {
            interval: formData.recurrenceInterval,
            time: formData.recurrenceTime,
          },
        };
      default:
        return { type: 'immediate' };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trigger = buildTrigger();

    if (editingNotification) {
      updateMutation.mutate({
        id: editingNotification.id,
        data: {
          name: formData.name,
          title: formData.title,
          body: formData.body,
          trigger,
          priority: formData.priority,
          enabled: formData.enabled,
        },
      });
    } else {
      createMutation.mutate({
        appId: params.appId!,
        name: formData.name,
        title: formData.title,
        body: formData.body,
        trigger,
        priority: formData.priority,
        enabled: formData.enabled,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{app?.name || 'App'}</h1>
          <p className="text-muted-foreground">Manage notifications for this app</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Notification
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No notifications yet</p>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first notification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const TriggerIcon = getTriggerIcon(notification.trigger.type);
            return (
              <Card key={notification.id} className="hover:bg-card/80 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Switch checked={notification.enabled} onCheckedChange={() => toggleMutation.mutate(notification.id)} />
                      <div>
                        <CardTitle className="text-base cursor-pointer hover:underline" onClick={() => handleOpenEdit(notification)}>
                          {notification.name}
                        </CardTitle>
                        <CardDescription className="mt-1">{notification.title}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={notification.enabled ? 'default' : 'secondary'} className="text-xs">
                        <TriggerIcon className="mr-1 h-3 w-3" />
                        {formatTrigger(notification.trigger)}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {notification.priority}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(notification)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(notification.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteNotification(notification)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingNotification ? 'Edit Notification' : 'Create Notification'}</DialogTitle>
              <DialogDescription>Configure the notification settings</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Welcome notification" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Welcome!" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} placeholder="Thanks for joining us..." required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="triggerType">Trigger Type</Label>
                <Select value={formData.triggerType} onValueChange={(v: NotificationFormData['triggerType']) => setFormData({ ...formData, triggerType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.triggerType === 'scheduled' && (
                <div className="grid gap-2">
                  <Label htmlFor="scheduledAt">Schedule Date & Time</Label>
                  <Input id="scheduledAt" type="datetime-local" value={formData.scheduledAt} onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })} />
                </div>
              )}
              {formData.triggerType === 'recurring' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceInterval">Recurrence</Label>
                    <Select
                      value={formData.recurrenceInterval}
                      onValueChange={(v: NotificationFormData['recurrenceInterval']) => setFormData({ ...formData, recurrenceInterval: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceTime">Time</Label>
                    <Input id="recurrenceTime" type="time" value={formData.recurrenceTime} onChange={(e) => setFormData({ ...formData, recurrenceTime: e.target.value })} />
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v: NotificationFormData['priority']) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch id="enabled" checked={formData.enabled} onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingNotification ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteNotification} onOpenChange={(open) => !open && setDeleteNotification(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteNotification?.name}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNotification && deleteMutation.mutate(deleteNotification.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

