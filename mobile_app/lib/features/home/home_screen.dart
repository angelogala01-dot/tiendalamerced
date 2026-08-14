import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/auth/auth_controller.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/core/widgets/ui_bits.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.auth,
    required this.onOpenScan,
    required this.onOpenDeliveries,
    required this.onOpenAlerts,
    required this.unread,
  });

  final AuthController auth;
  final VoidCallback onOpenScan;
  final VoidCallback onOpenDeliveries;
  final VoidCallback onOpenAlerts;
  final int unread;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiClient();
  int _deliveries = 0;
  int _lowStock = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.get('/orders/deliveries'),
        _api.get('/products/low-stock'),
      ]);
      final deliveries = results[0] is List ? results[0] as List : [];
      final stock = results[1] is List ? results[1] as List : [];
      if (!mounted) return;
      setState(() {
        _deliveries = deliveries.length;
        _lowStock = stock.length;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
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

  @override
  Widget build(BuildContext context) {
    final name = widget.auth.displayName;
    final role = roleLabel(widget.auth.profile?['role']?.toString());

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          children: [
            SafeArea(
              bottom: false,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: AppColors.ink,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'L',
                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
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
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.ink, Color(0xFF3A2A22)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Turno en tienda', style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 6),
                  const Text(
                    'Escanea productos, entrega pedidos y revisa avisos sin volver a la caja.',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600, height: 1.3),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _Quick(label: 'Escanear', icon: Icons.qr_code_scanner, onTap: widget.onOpenScan),
                      _Quick(label: 'Entregas', icon: Icons.local_shipping_outlined, onTap: widget.onOpenDeliveries),
                      _Quick(label: 'Avisos', icon: Icons.notifications_outlined, onTap: widget.onOpenAlerts),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text('Tu resumen', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, c) {
                final stats = [
                  _Stat(
                    title: 'Por entregar',
                    value: _loading ? '…' : '$_deliveries',
                    icon: Icons.local_shipping_outlined,
                    onTap: widget.onOpenDeliveries,
                  ),
                  _Stat(
                    title: 'Avisos',
                    value: '${widget.unread}',
                    icon: Icons.notifications_active_outlined,
                    onTap: widget.onOpenAlerts,
                  ),
                  _Stat(
                    title: 'Stock bajo',
                    value: _loading ? '…' : '$_lowStock',
                    icon: Icons.inventory_2_outlined,
                    danger: _lowStock > 0,
                  ),
                ];
                if (c.maxWidth < 480) {
                  return Column(
                    children: [
                      for (var i = 0; i < stats.length; i++) ...[
                        if (i > 0) const SizedBox(height: 10),
                        stats[i],
                      ],
                    ],
                  );
                }
                return Row(
                  children: [
                    for (var i = 0; i < stats.length; i++) ...[
                      if (i > 0) const SizedBox(width: 10),
                      Expanded(child: stats[i]),
                    ],
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            const Text('Consejo del turno', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(Icons.lightbulb_outline, color: AppColors.clay),
                title: Text(
                  _deliveries > 0
                      ? 'Tienes $_deliveries pedido(s) listos para salir. Abre la ruta en Maps antes de salir.'
                      : widget.unread > 0
                          ? 'Hay avisos nuevos. Revísalos para no perder un pedido o un quiebre de stock.'
                          : 'Todo tranquilo. Si llega un cliente, escanea el producto y confirma precio y stock.',
                ),
              ),
            ),
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
      color: Colors.white.withOpacity(0.12),
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Ink(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 10),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
            Text(title, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }
}
