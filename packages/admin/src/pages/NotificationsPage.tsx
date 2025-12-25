import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Plus, MoreHorizontal, Copy, Trash2, Calendar, Clock, Repeat, Zap, Users } from 'lucide-react';
import type { Notification, Trigger } from '@/lib/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
  segmentId: string;
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
  segmentId: '',
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

  const { data: segments = [] } = useQuery({
    queryKey: ['segments', params.appId],
    queryFn: () => api.segments.list(params.appId),
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
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.notifications.update>[1] }) => 
      api.notifications.update(id, data),
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
      segmentId: notification.segmentId || '',
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
          segmentId: formData.segmentId || undefined,
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
        segmentId: formData.segmentId || undefined,
        trigger,
        priority: formData.priority,
        enabled: formData.enabled,
      });
    }
  };

  const getSegmentName = (segmentId?: string) => {
    if (!segmentId) return null;
    return segments.find((s) => s.id === segmentId)?.name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{app?.name || 'Application'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure notifications for this application
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          New notification
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="border border-dashed rounded-xl p-8 sm:p-12 text-center">
          <div className="max-w-sm mx-auto">
            <p className="text-muted-foreground text-sm mb-4">No notifications yet</p>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create your first notification
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-12 px-5 py-3"></th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Notification
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Segment
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Trigger
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Priority
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notifications.map((notification) => {
                  const TriggerIcon = getTriggerIcon(notification.trigger.type);
                  const segmentName = getSegmentName(notification.segmentId);
                  return (
                    <tr key={notification.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <Switch 
                          checked={notification.enabled} 
                          onCheckedChange={() => toggleMutation.mutate(notification.id)} 
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button 
                          onClick={() => handleOpenEdit(notification)}
                          className="text-left"
                        >
                          <div className="font-medium text-sm">{notification.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {notification.title}
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {segmentName ? (
                          <Badge variant="outline" className="font-normal gap-1.5">
                            <Users className="h-3 w-3" />
                            {segmentName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">All users</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="secondary" className="font-normal gap-1.5">
                          <TriggerIcon className="h-3 w-3" />
                          {formatTrigger(notification.trigger)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge 
                          variant="outline" 
                          className="font-normal capitalize"
                        >
                          {notification.priority}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(notification)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(notification.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive" 
                              onClick={() => setDeleteNotification(notification)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {notifications.map((notification) => {
              const TriggerIcon = getTriggerIcon(notification.trigger.type);
              const segmentName = getSegmentName(notification.segmentId);
              return (
                <div key={notification.id} className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Switch 
                        checked={notification.enabled} 
                        onCheckedChange={() => toggleMutation.mutate(notification.id)} 
                        className="mt-0.5"
                      />
                      <button 
                        onClick={() => handleOpenEdit(notification)}
                        className="text-left flex-1 min-w-0"
                      >
                        <div className="font-medium text-sm truncate">{notification.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {notification.title}
                        </div>
                      </button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(notification)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(notification.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive" 
                          onClick={() => setDeleteNotification(notification)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {segmentName && (
                      <Badge variant="outline" className="font-normal gap-1.5">
                        <Users className="h-3 w-3" />
                        {segmentName}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="font-normal gap-1.5">
                      <TriggerIcon className="h-3 w-3" />
                      {formatTrigger(notification.trigger)}
                    </Badge>
                    <Badge variant="outline" className="font-normal capitalize">
                      {notification.priority}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingNotification ? 'Edit notification' : 'Create notification'}
              </DialogTitle>
              <DialogDescription>
                Configure the notification settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="Welcome notification" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="Welcome!" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body" className="text-sm font-medium">Body</Label>
                <Textarea 
                  id="body" 
                  value={formData.body} 
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })} 
                  placeholder="Thanks for joining us..." 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment" className="text-sm font-medium">
                  Target Segment
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </Label>
                <Select 
                  value={formData.segmentId || 'all'} 
                  onValueChange={(v) => setFormData({ ...formData, segmentId: v === 'all' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a segment to target specific users, or leave as "All users" for everyone
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="triggerType" className="text-sm font-medium">Trigger Type</Label>
                <Select 
                  value={formData.triggerType} 
                  onValueChange={(v: NotificationFormData['triggerType']) => setFormData({ ...formData, triggerType: v })}
                >
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
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt" className="text-sm font-medium">Schedule Date & Time</Label>
                  <Input 
                    id="scheduledAt" 
                    type="datetime-local" 
                    value={formData.scheduledAt} 
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })} 
                  />
                </div>
              )}
              {formData.triggerType === 'recurring' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceInterval" className="text-sm font-medium">Recurrence</Label>
                    <Select
                      value={formData.recurrenceInterval}
                      onValueChange={(v: NotificationFormData['recurrenceInterval']) => 
                        setFormData({ ...formData, recurrenceInterval: v })}
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
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceTime" className="text-sm font-medium">Time</Label>
                    <Input 
                      id="recurrenceTime" 
                      type="time" 
                      value={formData.recurrenceTime} 
                      onChange={(e) => setFormData({ ...formData, recurrenceTime: e.target.value })} 
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v: NotificationFormData['priority']) => setFormData({ ...formData, priority: v })}
                >
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
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="enabled" className="text-sm font-medium">Enabled</Label>
                <Switch 
                  id="enabled" 
                  checked={formData.enabled} 
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })} 
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending || updateMutation.isPending 
                  ? 'Saving...' 
                  : editingNotification ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteNotification} onOpenChange={(open) => !open && setDeleteNotification(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteNotification?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNotification && deleteMutation.mutate(deleteNotification.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
