import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Plus, MoreHorizontal, Key, Trash2, ArrowRight, Copy, Check } from 'lucide-react';
import { api, type App } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

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
      toast({ title: 'Application created' });
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
      toast({ title: 'Application deleted' });
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
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your applications and configure notifications
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="mr-1.5 h-4 w-4" />
              New application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create application</DialogTitle>
              <DialogDescription>
                Add a new application to manage local notifications
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="name" className="text-sm font-medium">Name</Label>
              <Input 
                id="name" 
                value={newAppName} 
                onChange={(e) => setNewAppName(e.target.value)} 
                placeholder="My Application" 
                className="mt-2"
                autoFocus 
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <div className="border border-dashed rounded-xl p-8 sm:p-12 text-center">
          <div className="max-w-sm mx-auto">
            <p className="text-muted-foreground text-sm mb-4">No applications yet</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create your first application
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Application
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    API Key
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {apps.map((app) => (
                  <tr key={app.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/apps/${app.id}/notifications`} className="block">
                        <div className="font-medium text-sm">{app.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{app.id}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                          {app.apiKey.slice(0, 12)}...{app.apiKey.slice(-8)}
                        </code>
                        <CopyButton text={app.apiKey} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/apps/${app.id}/notifications`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Notifications
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => regenerateMutation.mutate(app.id)}>
                              <Key className="mr-2 h-4 w-4" />
                              Regenerate API Key
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive" 
                              onClick={() => setDeleteApp(app)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {apps.map((app) => (
              <div key={app.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Link href={`/apps/${app.id}/notifications`} className="flex-1">
                    <div className="font-medium text-sm">{app.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5 break-all">{app.id}</div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => regenerateMutation.mutate(app.id)}>
                        <Key className="mr-2 h-4 w-4" />
                        Regenerate API Key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive" 
                        onClick={() => setDeleteApp(app)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                    {app.apiKey}
                  </code>
                  <CopyButton text={app.apiKey} />
                </div>
                <Link href={`/apps/${app.id}/notifications`} className="block">
                  <Button variant="outline" size="sm" className="w-full">
                    Notifications
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!deleteApp} onOpenChange={(open) => !open && setDeleteApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteApp?.name}"? All notifications will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteApp && deleteMutation.mutate(deleteApp.id)} 
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
