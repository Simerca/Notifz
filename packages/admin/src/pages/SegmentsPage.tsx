import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Plus, MoreVertical, Trash2, Users } from 'lucide-react';
import type { Segment, Condition } from '@localnotification/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface SegmentFormData {
  name: string;
  description: string;
  rules: Condition[];
}

const defaultFormData: SegmentFormData = {
  name: '',
  description: '',
  rules: [{ field: '', operator: 'eq', value: '' }],
};

const operators = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less or equal' },
  { value: 'contains', label: 'contains' },
];

function formatOperator(op: string): string {
  const found = operators.find((o) => o.value === op);
  return found?.label || op;
}

export default function SegmentsPage() {
  const params = useParams<{ appId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [deleteSegment, setDeleteSegment] = useState<Segment | null>(null);
  const [formData, setFormData] = useState<SegmentFormData>(defaultFormData);

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['segments', params.appId],
    queryFn: () => api.segments.list(params.appId),
    enabled: !!params.appId,
  });

  const createMutation = useMutation({
    mutationFn: api.segments.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments', params.appId] });
      handleCloseDialog();
      toast({ title: 'Segment created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.segments.update>[1] }) => api.segments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments', params.appId] });
      handleCloseDialog();
      toast({ title: 'Segment updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.segments.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments', params.appId] });
      setDeleteSegment(null);
      toast({ title: 'Segment deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenCreate = () => {
    setEditingSegment(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description || '',
      rules: segment.rules.length > 0 ? segment.rules : [{ field: '', operator: 'eq', value: '' }],
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSegment(null);
    setFormData(defaultFormData);
  };

  const handleAddRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, { field: '', operator: 'eq', value: '' }],
    });
  };

  const handleRemoveRule = (index: number) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index),
    });
  };

  const handleRuleChange = (index: number, field: keyof Condition, value: string | number | boolean) => {
    const newRules = [...formData.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFormData({ ...formData, rules: newRules });
  };

  const handleSubmit = () => {
    const validRules = formData.rules.filter((r) => r.field.trim() !== '');

    if (editingSegment) {
      updateMutation.mutate({
        id: editingSegment.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          rules: validRules,
        },
      });
    } else {
      createMutation.mutate({
        appId: params.appId!,
        name: formData.name,
        description: formData.description || undefined,
        rules: validRules,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Segments</h1>
          <p className="text-muted-foreground">Create user segments based on properties</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Segment
        </Button>
      </div>

      {segments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No segments yet</p>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {segments.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onEdit={() => handleOpenEdit(segment)}
              onDelete={() => setDeleteSegment(segment)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSegment ? 'Edit Segment' : 'Create Segment'}</DialogTitle>
            <DialogDescription>Define rules to target specific users</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Power Users" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Users with more than 20 games played" />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Rules</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddRule}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Rule
                </Button>
              </div>
              <div className="space-y-3">
                {formData.rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                    <Input
                      placeholder="property"
                      value={rule.field}
                      onChange={(e) => handleRuleChange(index, 'field', e.target.value)}
                      className="flex-1"
                    />
                    <Select value={rule.operator} onValueChange={(v) => handleRuleChange(index, 'operator', v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="value"
                      value={String(rule.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const numVal = Number(val);
                        handleRuleChange(index, 'value', isNaN(numVal) ? val : numVal);
                      }}
                      className="w-24"
                    />
                    {formData.rules.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveRule(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingSegment ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSegment} onOpenChange={(open) => !open && setDeleteSegment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Segment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteSegment?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteSegment && deleteMutation.mutate(deleteSegment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SegmentCard({ segment, onEdit, onDelete }: { segment: Segment; onEdit: () => void; onDelete: () => void }) {
  const { data: countData } = useQuery({
    queryKey: ['segment-count', segment.id],
    queryFn: () => api.segments.getCount(segment.id),
  });

  return (
    <Card className="hover:bg-card/80 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="cursor-pointer" onClick={onEdit}>
            <CardTitle className="text-base hover:underline">{segment.name}</CardTitle>
            {segment.description && <CardDescription className="mt-1">{segment.description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="mr-1 h-3 w-3" />
              {countData?.count ?? '...'} users
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {segment.rules.map((rule, i) => (
            <Badge key={i} variant="outline" className="text-xs font-mono">
              {rule.field} {formatOperator(rule.operator)} {String(rule.value)}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

