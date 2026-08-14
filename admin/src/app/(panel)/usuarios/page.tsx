'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserPen } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Profile, UserRole } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

const STAFF_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'seller', 'warehouse'];

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
  warehouse: 'Almacenero',
  customer: 'Cliente',
};

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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api<{ data: Profile[] | null }>('/users');
      return res.data ?? [];
    },
  });

  const filtered = users.filter(
    (u) => roleFilter === 'all' || u.role === roleFilter,
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
    mutationFn: () =>
      api('/users', { method: 'POST', body: JSON.stringify(createForm) }),
    onSuccess: () => {
      toast.success('Usuario creado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setCreateOpen(false);
      setCreateForm(emptyCreate);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      api(`/users/${selected!.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      }),
    onSuccess: () => {
      toast.success('Perfil actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditOpen(false);
      setSelected(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Usuario desactivado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteOpen(false);
      setSelected(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Usuarios y roles" description="Gestión RBAC del personal">
        <Button size="sm" className="gap-1.5" onClick={() => { setCreateForm(emptyCreate); setCreateOpen(true); }}>
          <Plus className="size-4" aria-hidden />
          Nuevo usuario
        </Button>
      </PageHeader>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="role-filter">Filtrar por rol</Label>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
          <SelectTrigger id="role-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
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
                  <TableHead scope="col" className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name ?? '—'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(role) => role && roleMutation.mutate({ id: user.id, role })}
                        disabled={roleMutation.isPending || user.role === 'customer'}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue>{roleLabels[user.role] ?? user.role}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
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
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${user.email}`}
                          onClick={() => {
                            setSelected(user);
                            setEditForm({ full_name: user.full_name ?? '', phone: user.phone ?? '' });
                            setEditOpen(true);
                          }}>
                          <UserPen className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Desactivar ${user.email}`}
                          onClick={() => { setSelected(user); setDeleteOpen(true); }}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin usuarios registrados.</p>
        )}
      </DataTableShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo usuario staff</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" required value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">Contraseña temporal</Label>
              <Input id="u-pass" type="password" required minLength={8} value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-name">Nombre completo</Label>
              <Input id="u-name" required value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-phone">Teléfono</Label>
              <Input id="u-phone" value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={createForm.role} onValueChange={(v) => v && setCreateForm((f) => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando…' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar perfil</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }}>
            <div className="space-y-2">
              <Label htmlFor="e-name">Nombre completo</Label>
              <Input id="e-name" required value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-phone">Teléfono</Label>
              <Input id="e-phone" value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={editMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Desactivar usuario"
        description={`¿Desactivar a "${selected?.email}"? No podrá acceder al sistema.`}
        confirmLabel="Desactivar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (selected) deleteMutation.mutate(selected.id); }}
      />
    </div>
  );
}
