import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Plus, MoreHorizontal, Copy, Trash2, Calendar, Clock, Repeat, Zap, Users, Globe } from 'lucide-react';
import type { Notification, Trigger, LocalizedContent } from '@/lib/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface NotificationFormData {
  name: string;
  title: string;
  body: string;
  titleFr: string;
  bodyFr: string;
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
  titleFr: '',
  bodyFr: '',
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

interface NotificationPreviewProps {
  title: string;
  body: string;
  appName: string;
}

function NotificationPreview({ title, body, appName }: NotificationPreviewProps) {
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className="space-y-4">
      {/* iOS Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          iOS
        </div>
        <div className="bg-[#f2f2f7] dark:bg-zinc-800 rounded-2xl p-3 shadow-sm border border-black/5 dark:border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0">
              {appName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {appName}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{timeNow}</span>
              </div>
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                {title}
              </p>
              <p className="text-[15px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-snug">
                {body}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Android Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.523 2.277a.75.75 0 01.137.961l-1.5 2.5a.75.75 0 11-1.283-.77l1.5-2.5a.75.75 0 011.146-.191zm-11.046 0a.75.75 0 011.146.191l1.5 2.5a.75.75 0 11-1.283.77l-1.5-2.5a.75.75 0 01.137-.961zM7 8a5 5 0 0110 0v1.293l2.354 2.353a.5.5 0 01.146.354V19a2 2 0 01-2 2H6.5a2 2 0 01-2-2v-7a.5.5 0 01.146-.354L7 9.293V8zm5-3a3 3 0 00-3 3v1.5a.5.5 0 01-.146.354L6.5 12.207V19a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-6.793l-2.354-2.353A.5.5 0 0115 9.5V8a3 3 0 00-3-3z"/>
          </svg>
          Android
        </div>
        <div className="bg-[#1f1f1f] rounded-xl p-3 shadow-lg border border-white/5">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
              {appName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-300">{appName}</span>
                <span className="text-[10px] text-gray-500">{timeNow}</span>
              </div>
              <p className="text-[14px] font-medium text-white truncate mt-0.5">
                {title}
              </p>
              <p className="text-[13px] text-gray-400 line-clamp-1 leading-snug">
                {body}
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Preview is approximate. Actual appearance may vary.
      </p>
    </div>
  );
}

export default function NotificationsPage() {
  const params = useParams<{ appId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState<NotificationFormData>(defaultFormData);
  const [previewLang, setPreviewLang] = useState<'en' | 'fr'>('en');

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
    setPreviewLang('en');
    setDialogOpen(true);
  };

  const handleOpenEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      name: notification.name,
      title: notification.title,
      body: notification.body,
      titleFr: notification.locales?.fr?.title || '',
      bodyFr: notification.locales?.fr?.body || '',
      segmentId: notification.segmentId || '',
      triggerType: notification.trigger.type,
      scheduledAt: notification.trigger.scheduledAt || '',
      recurrenceInterval: notification.trigger.recurrence?.interval || 'daily',
      recurrenceTime: notification.trigger.recurrence?.time || '09:00',
      priority: notification.priority,
      enabled: notification.enabled,
    });
    setPreviewLang('en');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNotification(null);
    setFormData(defaultFormData);
    setPreviewLang('en');
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
    
    const locales: Record<string, LocalizedContent> | undefined = 
      formData.titleFr || formData.bodyFr
        ? { fr: { title: formData.titleFr || formData.title, body: formData.bodyFr || formData.body } }
        : undefined;

    if (editingNotification) {
      updateMutation.mutate({
        id: editingNotification.id,
        data: {
          name: formData.name,
          title: formData.title,
          body: formData.body,
          locales,
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
        locales,
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingNotification ? 'Edit notification' : 'Create notification'}
              </DialogTitle>
              <DialogDescription>
                Configure the notification settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
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
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Content
                  </Label>
                  <Tabs value={previewLang} onValueChange={(v) => setPreviewLang(v as 'en' | 'fr')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="en">English (default)</TabsTrigger>
                      <TabsTrigger value="fr">Français</TabsTrigger>
                    </TabsList>
                    <TabsContent value="en" className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm">Title</Label>
                        <Input 
                          id="title" 
                          value={formData.title} 
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                          placeholder="Welcome!" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="body" className="text-sm">Body</Label>
                        <Textarea 
                          id="body" 
                          value={formData.body} 
                          onChange={(e) => setFormData({ ...formData, body: e.target.value })} 
                          placeholder="Thanks for joining us..." 
                          required 
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="fr" className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="titleFr" className="text-sm">Titre</Label>
                        <Input 
                          id="titleFr" 
                          value={formData.titleFr} 
                          onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })} 
                          placeholder="Bienvenue!" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bodyFr" className="text-sm">Message</Label>
                        <Textarea 
                          id="bodyFr" 
                          value={formData.bodyFr} 
                          onChange={(e) => setFormData({ ...formData, bodyFr: e.target.value })} 
                          placeholder="Merci de nous rejoindre..." 
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Laissez vide pour utiliser la version anglaise
                      </p>
                    </TabsContent>
                  </Tabs>
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

              {/* Preview Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Preview</div>
                  <div className="text-xs text-muted-foreground">
                    {previewLang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                  </div>
                </div>
                <NotificationPreview 
                  title={
                    previewLang === 'fr' 
                      ? (formData.titleFr || formData.title || 'Titre de notification')
                      : (formData.title || 'Notification Title')
                  } 
                  body={
                    previewLang === 'fr'
                      ? (formData.bodyFr || formData.body || 'Corps de la notification...')
                      : (formData.body || 'Notification body text...')
                  } 
                  appName={app?.name || 'App'}
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
