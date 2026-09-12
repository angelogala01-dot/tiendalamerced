import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/catalog/product_info.dart';
import 'package:la_merced_mobile/core/navigation/staff_actions.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/core/widgets/ui_bits.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, this.onChanged});

  final VoidCallback? onChanged;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = ApiClient();
  List<dynamic> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.get('/notifications', cache: false);
      setState(() {
        _items = data is List ? data : [];
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _markAll() async {
    await _api.patch('/notifications/read-all');
    await _load();
    widget.onChanged?.call();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Todos los avisos quedaron leídos'), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _open(Map<String, dynamic> n) async {
    final unread = n['is_read'] != true;
    if (unread) {
      try {
        await _api.patch('/notifications/${n['id']}/read');
        await _load();
        widget.onChanged?.call();
      } catch (_) {}
    }
    if (!mounted) return;

    final type = n['type']?.toString();
    final payload = ProductInfo.notificationPayload(n['data']);
    final productId = payload['product_id']?.toString();
    final sku = payload['sku']?.toString();
    final orderId = payload['order_id']?.toString();

    if (type == 'stock' && (productId != null && productId.isNotEmpty || sku != null && sku.isNotEmpty)) {
      await openProductById(context, id: productId, sku: sku);
      return;
    }
    if ((type == 'order' || orderId != null) && orderId != null && orderId.isNotEmpty) {
      await openDeliveryById(context, orderId);
      return;
    }

    if (!mounted) return;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(n['title']?.toString() ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(n['message']?.toString() ?? ''),
          ],
        ),
      ),
    );
  }

  Color _tone(String? type) {
    switch (type) {
      case 'stock':
        return const Color(0xFFB42318);
      case 'order':
        return AppColors.moss;
      default:
        return AppColors.clay;
    }
  }

  IconData _icon(String? type) {
    switch (type) {
      case 'stock':
        return Icons.warning_amber_rounded;
      case 'order':
        return Icons.receipt_long_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = _items.where((n) => n['is_read'] != true).length;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Avisos'),
        actions: [
          if (unread > 0) TextButton(onPressed: _markAll, child: const Text('Leer todo', style: TextStyle(color: Colors.white))),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? EmptyState(icon: Icons.wifi_off, title: 'Sin conexión', subtitle: _error!)
              : RefreshIndicator(
                  onRefresh: () async {
                    await _load();
                    widget.onChanged?.call();
                  },
                  child: _items.isEmpty
                      ? const EmptyState(
                          icon: Icons.notifications_none,
                          title: 'Todo en calma',
                          subtitle: 'Te avisaremos aquí si llega un pedido online o baja el stock.',
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final n = _items[i] as Map<String, dynamic>;
                            final isUnread = n['is_read'] != true;
                            final tone = _tone(n['type']?.toString());
                            final payload = ProductInfo.notificationPayload(n['data']);
                            final canOpen = payload['product_id'] != null || payload['order_id'] != null;
                            return Card(
                              color: isUnread ? tone.withOpacity(0.08) : Colors.white,
                              child: ListTile(
                                onTap: () => _open(n),
                                leading: CircleAvatar(
                                  backgroundColor: tone.withOpacity(0.15),
                                  child: Icon(_icon(n['type']?.toString()), color: tone),
                                ),
                                title: Text(
                                  n['title']?.toString() ?? '',
                                  style: TextStyle(fontWeight: isUnread ? FontWeight.w800 : FontWeight.w500),
                                ),
                                subtitle: Text(n['message']?.toString() ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                                trailing: canOpen
                                    ? Icon(Icons.chevron_right, color: tone)
                                    : (isUnread ? Icon(Icons.circle, size: 10, color: tone) : null),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
