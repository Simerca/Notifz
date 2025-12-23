import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Plus, MoreVertical, Key, Trash2, ArrowRight } from 'lucide-react';
import { api, type App } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function AppsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [deleteApp, setDeleteApp] = useState<App | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['apps'],
    queryFn: api.apps.list,
  });

  const createMutation = useMutation({
    mutationFn: api.apps.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setCreateOpen(false);
      setNewAppName('');
      toast({ title: 'App created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.apps.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setDeleteApp(null);
      toast({ title: 'App deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: api.apps.regenerateKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast({ title: 'API key regenerated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    if (newAppName.trim()) {
      createMutation.mutate({ name: newAppName.trim() });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
          <p className="text-muted-foreground">Manage your applications and their notifications</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create App</DialogTitle>
              <DialogDescription>Create a new app to manage local notifications</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="My App" autoFocus />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No apps yet</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first app
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Card key={app.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">{app.id}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => regenerateMutation.mutate(app.id)}>
                        <Key className="mr-2 h-4 w-4" />
                        Regenerate API Key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteApp(app)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">API Key</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block truncate">{app.apiKey}</code>
                  </div>
                  <Link href={`/apps/${app.id}/notifications`} className="flex items-center text-sm text-primary hover:underline">
                    Manage Notifications
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteApp} onOpenChange={(open) => !open && setDeleteApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteApp?.name}"? This will also delete all notifications associated with this app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteApp && deleteMutation.mutate(deleteApp.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

