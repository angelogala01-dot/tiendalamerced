'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Product, ProductImage } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EntitySelect, getBrandLabel } from '@/components/admin/entity-select';
import { ImageUpload } from '@/components/admin/image-upload';
import { ProductImageGallery } from '@/components/admin/product-image-gallery';
import { getPrimaryImageUrl } from '@/lib/catalog/product-images';
import { normalizeProduct } from '@/lib/catalog/normalize';
import {
  productFormSchema,
  validateImageFile,
  type ProductFormValues,
} from '@/features/productos/schemas/product-form.schema';
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

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const defaultValues: ProductFormValues = {
  sku: '',
  name: '',
  slug: '',
  description: '',
  category_id: '',
  brand_id: '',
  cost_price: 0,
  sale_price: 0,
  stock_quantity: 0,
  min_stock: 5,
  is_active: true,
};

function stockBadge(stock: number, minStock?: number) {
  if (stock <= 0) return <Badge variant="destructive">Sin stock</Badge>;
  if (minStock && stock <= minStock) {
    return (
      <Badge variant="outline" className="border-warning text-warning-foreground bg-warning/10">
        Bajo
      </Badge>
    );
  }
  return <Badge variant="secondary">{stock}</Badge>;
}

export default function AdminProductosPage() {
  const { api, upload } = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [skuManual, setSkuManual] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [pendingImages, setPendingImages] = useState<
    Array<{ url: string; storage_path: string; id: string }>
  >([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues,
  });

  const categoryId = form.watch('category_id');
  const brandId = form.watch('brand_id');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', { lite: true, limit: 100 }],
    queryFn: async () => {
      const res = await api<{ data: Product[] }>('/products?lite=true&limit=100');
      return { data: (res.data ?? []).map(normalizeProduct) };
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<Array<{ id: string; name: string; slug: string }>>('/categories'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: () => api<Array<{ id: string; name: string; slug: string }>>('/brands'),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (editing || skuManual || !categoryId || !brandId || !dialogOpen) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ sku: string }>(
          `/products/suggest-sku?categoryId=${categoryId}&brandId=${brandId}`,
        );
        if (!cancelled) form.setValue('sku', res.sku, { shouldValidate: true });
      } catch {
        /* sugerencia opcional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, brandId, categoryId, dialogOpen, editing, form, skuManual]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        sku: values.sku.trim().toUpperCase(),
        name: values.name.trim(),
        slug: values.slug?.trim() || slugify(values.name),
        description: values.description?.trim() || undefined,
        category_id: values.category_id,
        brand_id: values.brand_id,
        cost_price: values.cost_price,
        sale_price: values.sale_price,
        stock_quantity: values.stock_quantity,
        min_stock: values.min_stock,
        ...(editing ? { is_active: values.is_active ?? true } : {}),
      };

      let product: Product;
      if (editing) {
        product = await api<Product>(`/products/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        product = await api<Product>('/products', { method: 'POST', body: JSON.stringify(payload) });
      }

      for (let i = 0; i < pendingImages.length; i++) {
        const img = pendingImages[i];
        await api(`/products/${product.id}/images`, {
          method: 'POST',
          body: JSON.stringify({
            url: img.url,
            storage_path: img.storage_path,
            is_primary: productImages.length === 0 && i === 0,
          }),
        });
      }

      return product;
    },
    onSuccess: () => {
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Producto eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteOpen(false);
      setDeleting(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setSkuManual(false);
    setProductImages([]);
    setPendingImages([]);
    form.reset(defaultValues);
  }

  function openCreate() {
    setEditing(null);
    setSkuManual(false);
    setProductImages([]);
    setPendingImages([]);
    form.reset(defaultValues);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    const normalized = normalizeProduct(product);
    setEditing(normalized);
    setSkuManual(true);
    form.reset({
      sku: normalized.sku,
      name: normalized.name,
      slug: normalized.slug ?? '',
      description: normalized.description ?? '',
      category_id: normalized.category?.id ?? '',
      brand_id: normalized.brand?.id ?? '',
      cost_price: Number(normalized.cost_price),
      sale_price: Number(normalized.sale_price),
      stock_quantity: normalized.stock_quantity,
      min_stock: normalized.min_stock,
      is_active: normalized.is_active,
    });
    setProductImages(normalized.images ?? []);
    setPendingImages([]);
    setDialogOpen(true);
  }

  async function handleImageUpload(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      throw new Error(validationError);
    }

    const result = await upload<{ url: string; storage_path: string }>(
      '/upload/product-image',
      file,
    );

    if (editing) {
      const img = await api<ProductImage & { storage_path?: string }>(
        `/products/${editing.id}/images`,
        {
          method: 'POST',
          body: JSON.stringify({
            url: result.url,
            storage_path: result.storage_path,
            is_primary: !productImages.length,
          }),
        },
      );
      setProductImages((prev) => [...prev, img]);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Imagen agregada');
    } else {
      setPendingImages((prev) => [
        ...prev,
        { ...result, id: `pending-${prev.length}` },
      ]);
      toast.success('Imagen lista para guardar con el producto');
    }
  }

  async function removeImage(imageId: string) {
    if (!editing) return;
    await api(`/products/${editing.id}/images/${imageId}`, { method: 'DELETE' });
    setProductImages((prev) => prev.filter((i) => i.id !== imageId));
    toast.success('Imagen eliminada');
  }

  async function setPrimaryImage(imageId: string) {
    if (!editing) return;
    await api(`/products/${editing.id}/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_primary: true }),
    });
    setProductImages((prev) =>
      prev.map((i) => ({ ...i, is_primary: i.id === imageId })),
    );
    toast.success('Imagen principal actualizada');
  }

  async function regenerateSku() {
    if (!categoryId || !brandId) {
      toast.error('Seleccione categoría y marca primero');
      return;
    }
    try {
      const q = editing ? `&excludeId=${editing.id}` : '';
      const res = await api<{ sku: string }>(
        `/products/suggest-sku?categoryId=${categoryId}&brandId=${brandId}${q}`,
      );
      form.setValue('sku', res.sku, { shouldValidate: true });
      setSkuManual(false);
      toast.success('SKU generado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el SKU');
    }
  }

  const products = data?.data ?? [];
  const galleryImages = editing
    ? productImages
    : pendingImages.map((p, i) => ({
        id: p.id,
        url: p.url,
        storage_path: p.storage_path,
        is_primary: i === 0,
      }));

  const errors = form.formState.errors;

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Productos" description="Gestión del catálogo de productos">
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          Nuevo producto
        </Button>
      </PageHeader>

      <DataTableShell
        title="Listado de productos"
        description="Todos los productos registrados en el catálogo"
        isLoading={isLoading}
        actions={<Badge variant="outline">{products.length} productos</Badge>}
      >
        {products.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Imagen</TableHead>
                  <TableHead scope="col">SKU</TableHead>
                  <TableHead scope="col">Nombre</TableHead>
                  <TableHead scope="col">Marca</TableHead>
                  <TableHead scope="col" className="text-right">Precio</TableHead>
                  <TableHead scope="col" className="text-right">Stock</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col" className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const thumb = getPrimaryImageUrl(p.images);
                  return (
                    <TableRow key={p.id} className="transition-colors">
                      <TableCell>
                        <div className="size-10 overflow-hidden rounded-md border bg-muted">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center text-[9px] text-muted-foreground">
                              —
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm">{getBrandLabel(p.brand)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        S/ {Number(p.sale_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {stockBadge(p.stock_quantity, p.min_stock)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? 'default' : 'secondary'}>
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => { setDeleting(p); setDeleteOpen(true); }}>
                            <Trash2 className="size-4 text-destructive" />
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
            Sin productos registrados.
          </p>
        )}
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modifica los datos del producto.' : 'Completa los datos del nuevo producto.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-name">Nombre <span className="text-destructive">*</span></Label>
                <Input
                  id="product-name"
                  {...form.register('name', {
                    onChange: (e) => {
                      if (!editing) {
                        form.setValue('slug', slugify(e.target.value));
                      }
                    },
                  })}
                  aria-invalid={!!errors.name}
                />
                {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="product-sku">SKU <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => void regenerateSku()}>
                    <RefreshCw className="size-3" />
                    Generar
                  </Button>
                </div>
                <Input
                  id="product-sku"
                  {...form.register('sku', {
                    onChange: () => setSkuManual(true),
                  })}
                  aria-invalid={!!errors.sku}
                />
                {errors.sku ? <p className="text-sm text-destructive">{errors.sku.message}</p> : null}
                <p className="text-xs text-muted-foreground">Formato: CATEGORÍA-0001-MARCA</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-slug">Slug</Label>
              <Input id="product-slug" {...form.register('slug')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <EntitySelect
                label="Categoría"
                required
                value={categoryId}
                onChange={(v) => form.setValue('category_id', v, { shouldValidate: true })}
                items={categories}
                placeholder="Seleccione categoría"
                emptyLabel="Sin categoría"
                error={errors.category_id?.message}
              />
              <EntitySelect
                label="Marca"
                required
                value={brandId}
                onChange={(v) => form.setValue('brand_id', v, { shouldValidate: true })}
                items={brands}
                placeholder="Seleccione marca"
                emptyLabel="Sin marca"
                error={errors.brand_id?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-desc">Descripción</Label>
              <textarea
                id="product-desc"
                {...form.register('description')}
                rows={2}
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-cost">Precio costo (S/) <span className="text-destructive">*</span></Label>
                <Input id="product-cost" type="number" min="0" step="0.01" {...form.register('cost_price')} aria-invalid={!!errors.cost_price} />
                {errors.cost_price ? <p className="text-sm text-destructive">{errors.cost_price.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-sale">Precio venta (S/) <span className="text-destructive">*</span></Label>
                <Input id="product-sale" type="number" min="0" step="0.01" {...form.register('sale_price')} aria-invalid={!!errors.sale_price} />
                {errors.sale_price ? <p className="text-sm text-destructive">{errors.sale_price.message}</p> : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-stock">Stock <span className="text-destructive">*</span></Label>
                <Input id="product-stock" type="number" min="0" {...form.register('stock_quantity')} aria-invalid={!!errors.stock_quantity} />
                {errors.stock_quantity ? <p className="text-sm text-destructive">{errors.stock_quantity.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-min">Stock mínimo</Label>
                <Input id="product-min" type="number" min="0" {...form.register('min_stock')} aria-invalid={!!errors.min_stock} />
                {errors.min_stock ? <p className="text-sm text-destructive">{errors.min_stock.message}</p> : null}
              </div>
            </div>

            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  id="product-active"
                  type="checkbox"
                  checked={form.watch('is_active') ?? true}
                  onChange={(e) => form.setValue('is_active', e.target.checked)}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="product-active">Producto activo</Label>
              </div>
            ) : null}

            <div className="space-y-3 border-t pt-4">
              <Label>Imágenes del producto</Label>
              <ImageUpload
                label="Agregar imagen (JPG, PNG, WEBP)"
                onFileSelected={handleImageUpload}
                disabled={saveMutation.isPending}
              />
              <ProductImageGallery
                images={galleryImages}
                showActions={!!editing}
                onSetPrimary={editing ? (id) => void setPrimaryImage(id) : undefined}
                onRemove={editing ? (id) => void removeImage(id) : undefined}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar producto"
        description={`¿Eliminar "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); }}
      />
    </div>
  );
}
