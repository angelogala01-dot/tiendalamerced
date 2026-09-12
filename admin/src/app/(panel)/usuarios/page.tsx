'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2, UserPen } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { createClient } from '@/lib/supabase/client';
import type { Profile, UserRole } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ROLE_LABELS } from '@/lib/rbac';
import { STAFF_ROLES } from '@/constants/routes';
import {
  isOptionalPeruPhone,
  peruPhoneMessage,
  restrictDigits,
} from '@/lib/validation/peru';

type CreateForm = {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone: string;
};

type EditForm = {
  full_name: string;
  phone: string;
};

const emptyCreate: CreateForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'seller',
  phone: '',
};

export default function AdminUsuariosPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: '', phone: '' });
  const [selected, setSelected] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api<{ data: Profile[] | null }>('/users');
      return res.data ?? [];
    },
  });

  const filtered = useMemo(
    () => users.filter((u) => roleFilter === 'all' || u.role === roleFilter),
    [roleFilter, users],
  );

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: () => {
      toast.success('Rol actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!isOptionalPeruPhone(createForm.phone)) throw new Error(peruPhoneMessage());
      return api('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          phone: createForm.phone.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      toast.success('Usuario creado. Se envió un correo con los datos de acceso.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setCreateOpen(false);
      setCreateForm(emptyCreate);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      if (!isOptionalPeruPhone(editForm.phone)) throw new Error(peruPhoneMessage());
      return api(`/users/${selected!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editForm,
          phone: editForm.phone.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      toast.success('Perfil actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditOpen(false);
      setSelected(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: (_data, vars) => {
      toast.success(vars.is_active ? 'Usuario reactivado' : 'Usuario desactivado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteOpen(false);
      setSelected(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Usuarios y roles" description="Gestión RBAC del personal">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setCreateForm(emptyCreate);
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Nuevo usuario
        </Button>
      </PageHeader>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="role-filter">Filtrar por rol</Label>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
          <SelectTrigger id="role-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
            <SelectItem value="customer">Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTableShell
        title="Listado de usuarios"
        isLoading={isLoading}
        actions={<Badge variant="outline">{filtered.length} usuarios</Badge>}
      >
        {filtered.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Nombre</TableHead>
                  <TableHead scope="col">Email</TableHead>
                  <TableHead scope="col">Rol</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col" className="text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const isSelf = currentUserId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name ?? '—'}
                        {isSelf ? (
                          <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(role) =>
                            role && roleMutation.mutate({ id: user.id, role })
                          }
                          disabled={roleMutation.isPending || user.role === 'customer'}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue>{ROLE_LABELS[user.role] ?? user.role}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STAFF_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ${user.email}`}
                            onClick={() => {
                              setSelected(user);
                              setEditForm({
                                full_name: user.full_name ?? '',
                                phone: user.phone ?? '',
                              });
                              setEditOpen(true);
                            }}
                          >
                            <UserPen className="size-4" />
                          </Button>
                          {!user.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Reactivar ${user.email}`}
                              disabled={statusMutation.isPending}
                              onClick={() =>
                                statusMutation.mutate({ id: user.id, is_active: true })
                              }
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            aria-label={`Eliminar ${user.email}`}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? 'No puedes eliminarte a ti mismo'
                                : 'Eliminar permanentemente'
                            }
                            onClick={() => {
                              setSelected(user);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin usuarios registrados.
          </p>
        )}
      </DataTableShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario staff</DialogTitle>
            <DialogDescription>
              Recibirá un correo con el acceso al panel y la contraseña temporal.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">Contraseña temporal</Label>
              <Input
                id="u-pass"
                type="password"
                required
                minLength={8}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-name">Nombre completo</Label>
              <Input
                id="u-name"
                required
                value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-phone">Celular</Label>
              <Input
                id="u-phone"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                placeholder="9XXXXXXXX"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, phone: restrictDigits(e.target.value, 9) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) =>
                  v && setCreateForm((f) => ({ ...f, role: v as UserRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando…' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="e-name">Nombre completo</Label>
              <Input
                id="e-name"
                required
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-phone">Celular</Label>
              <Input
                id="e-phone"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                placeholder="9XXXXXXXX"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: restrictDigits(e.target.value, 9) }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar usuario"
        description={`¿Eliminar permanentemente a "${selected?.email}"? Se borrará su cuenta de acceso y no podrá iniciar sesión. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (selected) deleteMutation.mutate(selected.id);
        }}
      />
    </div>
  );
}
