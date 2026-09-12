import 'dart:async';

import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/catalog/product_info.dart';
import 'package:la_merced_mobile/core/navigation/staff_actions.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/core/widgets/ui_bits.dart';
import 'package:la_merced_mobile/features/scan/scan_screen.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key, this.initialFilter = StockAvailability.all});

  final StockAvailability initialFilter;

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _api = ApiClient();
  final _search = TextEditingController();
  Timer? _debounce;
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _categories = [];
  bool _loading = true;
  String? _error;
  String _query = '';
  String? _categoryId;
  late StockAvailability _filter;

  @override
  void initState() {
    super.initState();
    _filter = widget.initialFilter;
    _loadCategories();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final data = await _api.getList('/categories');
      if (!mounted) return;
      setState(() {
        _categories = data.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
      });
    } catch (_) {}
  }

  Future<void> _load() async {
    final first = _products.isEmpty;
    if (first && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final q = _query.trim();
      final path = StringBuffer('/products?lite=true&active=true&limit=100');
      if (q.length >= 2) path.write('&search=${Uri.encodeComponent(q)}');
      if (_categoryId != null) path.write('&categoryId=${Uri.encodeComponent(_categoryId!)}');
      final res = await _api.get(path.toString(), cache: false);
      final data = res is Map ? res['data'] : null;
      if (!mounted) return;
      setState(() {
        _products = data is List
            ? data.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList()
            : [];
        _loading = false;
        _error = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (_products.isEmpty) {
          _error = 'No se pudo cargar el stock. Revisa la conexión.';
        }
      });
    }
  }

  void _onQuery(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () {
      _query = value;
      _load();
    });
  }

  List<Map<String, dynamic>> get _visible {
    return _products.where((product) => ProductInfo.matchesAvailability(product, _filter)).toList();
  }

  void _openScan() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ScanScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final items = _visible;
    const danger = Color(0xFFB42318);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock'),
        actions: [
          IconButton(
            tooltip: 'Escanear código',
            onPressed: _openScan,
            icon: const Icon(Icons.qr_code_scanner),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: 'Nombre, SKU o código de barras',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: _onQuery,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                for (final option in StockAvailability.values) ...[
                  FilterChip(
                    selected: _filter == option,
                    label: Text(_filterLabel(option)),
                    onSelected: (_) => setState(() => _filter = option),
                    selectedColor: option == StockAvailability.out || option == StockAvailability.low
                        ? const Color(0xFFFFE4DE)
                        : AppColors.clay.withValues(alpha: 0.18),
                    checkmarkColor: option == StockAvailability.out || option == StockAvailability.low
                        ? danger
                        : AppColors.clay,
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          if (_categories.isNotEmpty) ...[
            const SizedBox(height: 6),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  FilterChip(
                    selected: _categoryId == null,
                    label: const Text('Todas'),
                    onSelected: (_) {
                      setState(() => _categoryId = null);
                      _load();
                    },
                  ),
                  const SizedBox(width: 8),
                  for (final category in _categories) ...[
                    FilterChip(
                      selected: _categoryId == category['id']?.toString(),
                      label: Text(category['name']?.toString() ?? 'Categoría'),
                      onSelected: (_) {
                        final id = category['id']?.toString();
                        setState(() => _categoryId = _categoryId == id ? null : id);
                        _load();
                      },
                    ),
                    const SizedBox(width: 8),
                  ],
                ],
              ),
            ),
          ],
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _loading ? 'Cargando stock…' : '${items.length} producto${items.length == 1 ? '' : 's'}',
                style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.w600),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? ListView(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: ErrorBanner(message: _error!, onRetry: _load),
                          ),
                        ],
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: items.isEmpty
                            ? const EmptyState(
                                icon: Icons.inventory_2_outlined,
                                title: 'Sin productos',
                                subtitle: 'Prueba otra búsqueda o cambia el filtro de stock.',
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                itemCount: items.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 8),
                                itemBuilder: (_, i) {
                                  final product = items[i];
                                  final variants = ProductInfo.activeVariants(product);
                                  final out = ProductInfo.isOutOfStock(product);
                                  final low = ProductInfo.isLowStock(product);
                                  final image = ProductInfo.imageUrl(product);
                                  final category = ProductInfo.categoryName(product);
                                  final tone = out || low ? danger : AppColors.moss;
                                  return Card(
                                    child: ListTile(
                                      onTap: () => showProductSheet(context, product),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      leading: CircleAvatar(
                                        radius: 26,
                                        backgroundColor: AppColors.sand,
                                        backgroundImage: image != null ? NetworkImage(image) : null,
                                        child: image == null
                                            ? const Icon(Icons.inventory_2_outlined, color: AppColors.clay)
                                            : null,
                                      ),
                                      title: Text(
                                        product['name']?.toString() ?? 'Producto',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontWeight: FontWeight.w700),
                                      ),
                                      subtitle: Text(
                                        [
                                          if (category != null) category,
                                          'SKU ${product['sku'] ?? '—'}',
                                          if (variants.isNotEmpty) '${variants.length} tallas',
                                        ].join(' · '),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      trailing: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            ProductInfo.money(product['sale_price']),
                                            style: const TextStyle(fontWeight: FontWeight.w800),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            ProductInfo.stockBadge(product),
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: tone,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  String _filterLabel(StockAvailability filter) {
    switch (filter) {
      case StockAvailability.all:
        return 'Todos';
      case StockAvailability.available:
        return 'Disponible';
      case StockAvailability.low:
        return 'Stock bajo';
      case StockAvailability.out:
        return 'Agotado';
    }
  }
}
