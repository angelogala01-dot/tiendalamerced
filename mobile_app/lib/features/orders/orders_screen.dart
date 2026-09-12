import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/orders/order_info.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/core/widgets/ui_bits.dart';
import 'package:la_merced_mobile/features/orders/order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key, this.initialStatus});

  final String? initialStatus;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _api = ApiClient();
  final _search = TextEditingController();
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _error;
  late String? _status;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _status = widget.initialStatus;
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final path = _status == null ? '/orders' : '/orders?status=${Uri.encodeComponent(_status!)}';
      final data = await _api.get(path, cache: false);
      if (!mounted) return;
      setState(() {
        _orders = OrderInfo.asOrderList(data);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudieron cargar los pedidos online. Revisa la conexión.';
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _visible {
    return _orders.where((order) => OrderInfo.matchesQuery(order, _query)).toList();
  }

  Future<void> _open(Map<String, dynamic> order) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order)),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final items = _visible;

    return Scaffold(
      appBar: AppBar(title: Text(_loading ? 'Pedidos' : 'Pedidos (${items.length})')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: 'Nº de pedido, cliente o teléfono',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                for (final status in OrderInfo.statusFilters) ...[
                  FilterChip(
                    selected: _status == status,
                    label: Text(status == null ? 'Todos' : statusLabel(status)),
                    onSelected: (_) {
                      setState(() => _status = status);
                      _load();
                    },
                    selectedColor: AppColors.clay.withValues(alpha: 0.18),
                    checkmarkColor: AppColors.clay,
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),
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
                                icon: Icons.receipt_long_outlined,
                                title: 'Sin pedidos',
                                subtitle: 'No hay pedidos online con ese filtro. Prueba otro estado o búsqueda.',
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                itemCount: items.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (_, i) {
                                  final order = items[i];
                                  final status = order['status']?.toString();
                                  final count = OrderInfo.itemCount(order);
                                  return Card(
                                    child: InkWell(
                                      borderRadius: BorderRadius.circular(18),
                                      onTap: () => _open(order),
                                      child: Padding(
                                        padding: const EdgeInsets.all(16),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    order['order_number']?.toString() ?? 'Pedido',
                                                    style: const TextStyle(
                                                      fontWeight: FontWeight.w800,
                                                      fontSize: 16,
                                                    ),
                                                  ),
                                                ),
                                                StatusChip(
                                                  label: statusLabel(status),
                                                  tone: OrderInfo.statusColor(status),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              OrderInfo.customerName(order),
                                              style: const TextStyle(fontWeight: FontWeight.w600),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              [
                                                OrderInfo.formatDate(order['created_at'], withTime: false),
                                                OrderInfo.fulfillmentLabel(order),
                                                if (count > 0) '$count und.',
                                              ].join(' · '),
                                              style: TextStyle(color: Colors.grey[700], fontSize: 13),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              OrderInfo.money(order['total']),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 16,
                                                color: AppColors.clay,
                                              ),
                                            ),
                                          ],
                                        ),
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
}
