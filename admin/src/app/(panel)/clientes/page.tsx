'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Customer } from '@/types';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CustomerForm = {
  full_name: string;
  email: string;
  phone: string;
  document_type: string;
  document_number: string;
  address: string;
  city: string;
};

const emptyForm: CustomerForm = {
  full_name: '',
  email: '',
  phone: '',
  document_type: 'DNI',
  document_number: '',
  address: '',
  city: '',
};

export default function AdminClientesPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: async () => {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await api<{ data: Customer[] | null }>(`/customers${q}`);
      return res.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        document_type: form.document_type || undefined,
        document_number: form.document_number.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
      };
      if (editing) {
        return api(`/customers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      return api('/customers', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'Cliente actualizado' : 'Cliente creado');
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Cliente desactivado');
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      setDeleteOpen(false);
      setDeleting(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const customers = data ?? [];

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Clientes" description="Base de clientes registrados">
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden />
          Nuevo cliente
        </Button>
      </PageHeader>

      <div className="max-w-md space-y-2">
        <Label htmlFor="customer-search">Buscar cliente</Label>
        <Input
          id="customer-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre, email o teléfono…"
        />
      </div>

      <DataTableShell title="Listado de clientes" isLoading={isLoading}
        actions={<Badge variant="outline">{customers.length} clientes</Badge>}>
        {customers.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>
                        {c.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => {
                          setEditing(c);
                          setForm({
                            full_name: c.full_name,
                            email: c.email ?? '',
                            phone: c.phone ?? '',
                            document_type: c.document_type ?? 'DNI',
                            document_number: c.document_number ?? '',
                            address: '',
                            city: '',
                          });
                          setDialogOpen(true);
                        }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => { setDeleting(c); setDeleteOpen(true); }}>
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
          <p className="py-8 text-center text-sm text-muted-foreground">Sin clientes encontrados.</p>
        )}
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Doc. tipo</Label>
                <Input value={form.document_type} onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Doc. número</Label>
                <Input value={form.document_number} onChange={(e) => setForm((f) => ({ ...f, document_number: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Desactivar cliente"
        description={`¿Desactivar a "${deleting?.full_name}"?`}
        confirmLabel="Desactivar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); }}
      />
    </div>
  );
}
