import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Search, Eye, Calendar, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function UsersPage() {
  const params = useParams<{ appId: string }>();
  const [offset, setOffset] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['users', params.appId, offset],
    queryFn: () => api.users.list(params.appId, limit, offset),
    enabled: !!params.appId,
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const filteredUsers = searchQuery
    ? users.filter((user) =>
        user.externalId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(user.properties).some((v) =>
          String(v).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : users;

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
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">{total} users tracked</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No users tracked yet</p>
            <p className="text-sm text-muted-foreground mt-1">Users will appear here when they use your app with the SDK</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">User ID</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Properties</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">First Seen</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Last Seen</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{user.externalId}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(user.properties).slice(0, 3).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs font-mono">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                        {Object.keys(user.properties).length > 3 && (
                          <Badge
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-secondary/80"
                            onClick={() => setSelectedUser(user)}
                          >
                            +{Object.keys(user.properties).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(user.firstSeen).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(user.lastSeen).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} users
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{selectedUser?.externalId}</code>
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    First Seen
                  </div>
                  <p className="text-sm font-medium">
                    {new Date(selectedUser.firstSeen).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last Seen
                  </div>
                  <p className="text-sm font-medium">
                    {new Date(selectedUser.lastSeen).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Properties ({Object.keys(selectedUser.properties).length})</h4>
                <div className="border rounded-lg divide-y">
                  {Object.entries(selectedUser.properties).length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      No properties
                    </div>
                  ) : (
                    Object.entries(selectedUser.properties).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm font-mono text-muted-foreground">{key}</span>
                        <span className="text-sm font-medium">
                          {typeof value === 'boolean' ? (
                            <Badge variant={value ? 'default' : 'secondary'}>
                              {String(value)}
                            </Badge>
                          ) : typeof value === 'number' ? (
                            <Badge variant="outline" className="font-mono">
                              {value}
                            </Badge>
                          ) : (
                            String(value)
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
