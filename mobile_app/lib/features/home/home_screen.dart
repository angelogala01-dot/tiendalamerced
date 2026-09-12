import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/auth/auth_controller.dart';
import 'package:la_merced_mobile/core/catalog/product_info.dart';
import 'package:la_merced_mobile/core/navigation/staff_actions.dart';
import 'package:la_merced_mobile/core/orders/order_info.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/core/widgets/ui_bits.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.auth,
    required this.onOpenScan,
    required this.onOpenStock,
    required this.onOpenOrders,
    required this.onOpenAlerts,
    required this.unread,
  });

  final AuthController auth;
  final VoidCallback onOpenScan;
  final void Function([StockAvailability? filter]) onOpenStock;
  final void Function([String? status]) onOpenOrders;
  final VoidCallback onOpenAlerts;
  final int unread;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiClient();
  int _activeOrders = 0;
  int _lowStock = 0;
  List<Map<String, dynamic>> _lowStockItems = const [];
  List<Map<String, dynamic>> _recentOrders = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final firstLoad = _loading && _activeOrders == 0 && _lowStock == 0 && _error == null;
    if (firstLoad) setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.get('/orders', cache: false),
        _api.get('/products/low-stock', cache: false),
      ]);
      final orders = OrderInfo.asOrderList(results[0]);
      final stock = results[1] is List ? results[1] as List : [];
      final active = orders.where(OrderInfo.isActive).toList();
      if (!mounted) return;
      setState(() {
        _activeOrders = active.length;
        _recentOrders = active.take(3).toList();
        _lowStock = stock.length;
        _lowStockItems = stock
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
        _loading = false;
        _error = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'No se pudo cargar el resumen. Revisa la conexión e inténtalo de nuevo.';
      });
    }
  }

  Future<void> _confirmLogout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: Text('¿Salir, ${widget.auth.displayName}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salir')),
        ],
      ),
    );
    if (ok == true) widget.auth.logout();
  }

  String get _tip {
    if (_activeOrders > 0) {
      return 'Hay $_activeOrders pedido(s) online activos. Ábrelos para ver cliente, talla y estado.';
    }
    if (widget.unread > 0) {
      return 'Hay avisos nuevos. Tócalos para ir al pedido o al producto.';
    }
    if (_lowStock > 0) {
      return '$_lowStock producto(s) con stock bajo. Confirma talla antes de ofrecerlos.';
    }
    return 'Consulta stock o un pedido online desde las pestañas. Si el cliente trae el producto, escanea el código.';
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.auth.displayName;
    final role = roleLabel(widget.auth.profile?['role']?.toString());
    final preview = _lowStockItems.take(3).toList();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          children: [
            SafeArea(
              bottom: false,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppColors.ink,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'L',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${greetingForNow()},', style: TextStyle(color: Colors.grey[700])),
                        Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                  IconButton(onPressed: _confirmLogout, icon: const Icon(Icons.logout)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: StatusChip(label: role, tone: AppColors.moss),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.ink, Color(0xFF3A2A22)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ventas en tienda', style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 6),
                  const Text(
                    'Stock al momento y pedidos online, para atender al cliente sin volver al escritorio.',
                    style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600, height: 1.3),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _Quick(label: 'Escanear', icon: Icons.qr_code_scanner, onTap: widget.onOpenScan),
                      _Quick(label: 'Stock', icon: Icons.inventory_2_outlined, onTap: () => widget.onOpenStock()),
                      _Quick(label: 'Pedidos', icon: Icons.receipt_long_outlined, onTap: () => widget.onOpenOrders()),
                      _Quick(label: 'Avisos', icon: Icons.notifications_outlined, onTap: widget.onOpenAlerts),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            if (_error != null) ...[
              ErrorBanner(message: _error!, onRetry: _load),
              const SizedBox(height: 16),
            ],
            Text('Tu resumen', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _Stat(
                    title: 'Pedidos activos',
                    value: _loading ? '…' : '$_activeOrders',
                    icon: Icons.receipt_long_outlined,
                    onTap: () => widget.onOpenOrders(),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Stat(
                    title: 'Avisos',
                    value: '${widget.unread}',
                    icon: Icons.notifications_active_outlined,
                    onTap: widget.onOpenAlerts,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Stat(
                    title: 'Stock bajo',
                    value: _loading ? '…' : '$_lowStock',
                    icon: Icons.inventory_2_outlined,
                    danger: _lowStock > 0,
                    onTap: () => widget.onOpenStock(StockAvailability.low),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(_tip, style: TextStyle(color: Colors.grey[700], height: 1.35)),
            if (_recentOrders.isNotEmpty) ...[
              const SizedBox(height: 18),
              Row(
                children: [
                  const Expanded(
                    child: Text('Pedidos por atender', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ),
                  TextButton(onPressed: () => widget.onOpenOrders(), child: const Text('Ver todos')),
                ],
              ),
              for (final order in _recentOrders)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Card(
                    child: ListTile(
                      onTap: () => openOrderById(context, id: order['id']?.toString(), order: order),
                      title: Text(
                        order['order_number']?.toString() ?? 'Pedido',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      subtitle: Text(
                        '${OrderInfo.customerName(order)} · ${statusLabel(order['status']?.toString())}',
                      ),
                      trailing: Text(
                        OrderInfo.money(order['total']),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ),
            ],
            if (preview.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Expanded(
                    child: Text('Revisar stock', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ),
                  TextButton(onPressed: () => widget.onOpenStock(StockAvailability.low), child: const Text('Ver stock')),
                ],
              ),
              for (final item in preview)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Card(
                    child: ListTile(
                      onTap: () => openProductById(
                        context,
                        id: item['id']?.toString(),
                        sku: item['sku']?.toString(),
                      ),
                      title: Text(item['name']?.toString() ?? 'Producto', maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text(
                        'SKU ${item['sku'] ?? '—'} · ${item['stock_quantity'] ?? 0} uds',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Quick extends StatelessWidget {
  const _Quick({required this.label, required this.icon, required this.onTap});

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white, size: 16),
              const SizedBox(width: 6),
              Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.title,
    required this.value,
    required this.icon,
    this.onTap,
    this.danger = false,
  });

  final String title;
  final String value;
  final IconData icon;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? const Color(0xFFB42318) : AppColors.clay;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
          child: Column(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 6),
              Text(
                value,
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color),
              ),
              const SizedBox(height: 2),
              Text(
                title,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: Colors.grey[600], fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
