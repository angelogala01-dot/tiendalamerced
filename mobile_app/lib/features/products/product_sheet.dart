import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/catalog/product_info.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';

class ProductSheet extends StatefulWidget {
  const ProductSheet({super.key, required this.product});

  final Map<String, dynamic> product;

  @override
  State<ProductSheet> createState() => _ProductSheetState();
}

class _ProductSheetState extends State<ProductSheet> {
  late String _size;
  late String _color;

  List<Map<String, dynamic>> get _variants => ProductInfo.activeVariants(widget.product);

  List<String> get _sizes => ProductInfo.optionValues(_variants, 'size');

  List<String> get _colors => ProductInfo.optionValues(_variants, 'color');

  @override
  void initState() {
    super.initState();
    final matched = ProductInfo.matchedVariant(widget.product);
    _size = matched?['size']?.toString() ?? (_sizes.length == 1 ? _sizes.first : '');
    _color = matched?['color']?.toString() ?? (_colors.length == 1 ? _colors.first : '');
  }

  Map<String, dynamic>? get _selected {
    if (_variants.isEmpty) return null;
    if (_sizes.isNotEmpty && _size.isEmpty) return null;
    if (_colors.isNotEmpty && _color.isEmpty) return null;
    for (final variant in _variants) {
      final sizeOk = _sizes.isEmpty || variant['size']?.toString() == _size;
      final colorOk = _colors.isEmpty || variant['color']?.toString() == _color;
      if (sizeOk && colorOk) return variant;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final selected = _selected;
    final stock = selected != null
        ? ProductInfo.stockOf(selected)
        : ProductInfo.stockOf(product);
    final minStock = ProductInfo.minStockOf(product);
    final low = stock <= minStock;
    final imageUrl = ProductInfo.imageUrl(product);
    final needsChoice = _variants.length > 1 && selected == null;
    final maxW = MediaQuery.sizeOf(context).width;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(maxW > 600 ? 32 : 20, 8, maxW > 600 ? 32 : 20, 24 + bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (imageUrl != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    imageUrl,
                    height: 140,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
              const SizedBox(height: 12),
              Text(
                product['name']?.toString() ?? 'Producto',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text('SKU ${selected?['sku'] ?? product['sku'] ?? '—'}'),
              if (ProductInfo.categoryName(product) != null) ...[
                const SizedBox(height: 4),
                Text(
                  ProductInfo.categoryName(product)!,
                  style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.w600),
                ),
              ],
              if (selected != null && ProductInfo.variantLabel(selected).isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  ProductInfo.variantLabel(selected),
                  style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.w600),
                ),
              ],
              if (_sizes.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text('Talla', style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final size in _sizes)
                      _ChoiceChip(
                        label: size,
                        selected: _size == size,
                        onTap: () => setState(() => _size = size),
                      ),
                  ],
                ),
              ],
              if (_colors.isNotEmpty) ...[
                const SizedBox(height: 14),
                const Text('Color', style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final color in _colors)
                      _ChoiceChip(
                        label: color,
                        selected: _color == color,
                        onTap: () => setState(() => _color = color),
                      ),
                  ],
                ),
              ],
              if (_variants.length > 1) ...[
                const SizedBox(height: 14),
                Text('Stock por talla', style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                ..._variants.map((variant) {
                  final qty = ProductInfo.stockOf(variant);
                  final label = ProductInfo.variantLabel(variant);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Expanded(child: Text(label.isEmpty ? 'Variante' : label)),
                        Text(
                          qty <= 0 ? 'Sin stock' : '$qty uds',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: qty <= minStock ? const Color(0xFFB42318) : AppColors.moss,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  _Info(label: 'Precio', value: ProductInfo.money(product['sale_price']), color: AppColors.clay),
                  const SizedBox(width: 10),
                  _Info(
                    label: needsChoice
                        ? 'Elige talla'
                        : low
                            ? 'Stock bajo'
                            : stock <= 0
                                ? 'Agotado'
                                : 'Disponible',
                    value: needsChoice ? '—' : '$stock und.',
                    color: needsChoice
                        ? Colors.grey
                        : stock <= 0 || low
                            ? const Color(0xFFB42318)
                            : AppColors.moss,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                needsChoice
                    ? 'Elige talla y color para ver el stock real de esa variante.'
                    : stock <= 0
                        ? 'No hay unidades de esta talla. Ofrece otra o revisa reposición.'
                        : low
                            ? 'Queda poco. Avísale al cliente y revisa reposición en almacén.'
                            : 'Puedes venderlo: hay unidades en tienda.',
                style: TextStyle(color: Colors.grey[700]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChoiceChip extends StatelessWidget {
  const _ChoiceChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.clay : Colors.white,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: selected ? AppColors.clay : Colors.black12),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppColors.ink,
            ),
          ),
        ),
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
            Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}
