'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Supplier } from '@/types';
import {
  isOptionalPeruPhone,
  isPeruTaxId,
  peruPhoneMessage,
  peruTaxIdMessage,
  restrictDigits,
} from '@/lib/validation/peru';
import { PageHeader } from '@/components/admin/page-header';
import { CatalogSwitcher } from '@/components/admin/catalog-switcher';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SupplierForm = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: SupplierForm = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  tax_id: '',
  notes: '',
  is_active: true,
};

export default function AdminProveedoresPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: () => api<Supplier[]>('/suppliers'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isOptionalPeruPhone(form.phone)) throw new Error(peruPhoneMessage());
      if (form.tax_id.trim() && !isPeruTaxId(form.tax_id)) throw new Error(peruTaxIdMessage());
      const payload = {
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        tax_id: form.tax_id.trim() || undefined,
        notes: form.notes.trim() || undefined,
        ...(editing ? { is_active: form.is_active } : {}),
      };
      if (editing) {
        return api<Supplier>(`/suppliers/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return api<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'Proveedor actualizado' : 'Proveedor creado');
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/suppliers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Proveedor eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteOpen(false);
      setDeleting(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      tax_id: supplier.tax_id ?? '',
      notes: supplier.notes ?? '',
      is_active: supplier.is_active,
    });
    setDialogOpen(true);
  }

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader
        title="Proveedores"
        description="Quién abastece. Luego puedes vincularlos a marcas y productos."
      >
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          Nuevo proveedor
        </Button>
      </PageHeader>

      <CatalogSwitcher />

      <DataTableShell
        title="Listado de proveedores"
        isLoading={isLoading}
        actions={<Badge variant="outline">{suppliers.length} proveedores</Badge>}
      >
        {suppliers.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Nombre</TableHead>
                <TableHead scope="col">Contacto</TableHead>
                <TableHead scope="col">Teléfono</TableHead>
                <TableHead scope="col">RUC / DNI</TableHead>
                <TableHead scope="col" className="text-right">Marcas</TableHead>
                <TableHead scope="col" className="text-right">Productos</TableHead>
                <TableHead scope="col" className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {supplier.contact_name || supplier.email || '—'}
                  </TableCell>
                  <TableCell className="text-sm">{supplier.phone || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {supplier.tax_id || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{supplier.brand_count ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{supplier.product_count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(supplier)}
                        aria-label={`Editar ${supplier.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setDeleting(supplier);
                          setDeleteOpen(true);
                        }}
                        aria-label={`Eliminar ${supplier.name}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin proveedores registrados. Agrega quien te envía productos y marcas.
          </p>
        )}
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
            <DialogDescription>Datos de contacto de quien abastece el catálogo.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error('El nombre es obligatorio');
                return;
              }
              saveMutation.mutate();
            }}
            className="grid gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Nombre de la empresa</Label>
              <Input
                id="supplier-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-contact">Persona de contacto</Label>
                <Input
                  id="supplier-contact"
                  value={form.contact_name}
                  onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-tax">RUC / DNI</Label>
                <Input
                  id="supplier-tax"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="RUC 11 dígitos o DNI 8"
                  value={form.tax_id}
                  onChange={(e) => setForm((f) => ({ ...f, tax_id: restrictDigits(e.target.value, 11) }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Teléfono</Label>
                <Input
                  id="supplier-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="9XXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: restrictDigits(e.target.value, 9) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Correo</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Dirección</Label>
              <Input
                id="supplier-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-notes">Notas</Label>
              <textarea
                id="supplier-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  id="supplier-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="supplier-active">Proveedor activo</Label>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar proveedor"
        description={`¿Eliminar "${deleting?.name}"? Los productos y marcas quedarán sin proveedor asignado.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
      />
    </div>
  );
}
