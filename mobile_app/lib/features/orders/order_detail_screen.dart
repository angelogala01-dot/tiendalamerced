import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/orders/order_info.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/core/widgets/ui_bits.dart';
import 'package:la_merced_mobile/features/deliveries/deliveries_screen.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.order});

  final Map<String, dynamic> order;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final _api = ApiClient();
  late Map<String, dynamic> _order;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _order = Map<String, dynamic>.from(widget.order);
    _refresh();
  }

  Future<void> _refresh() async {
    final id = _order['id']?.toString();
    if (id == null || id.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    try {
      final fetched = await _api.get('/orders/$id', cache: false);
      if (!mounted) return;
      if (fetched is Map) {
        setState(() {
          _order = Map<String, dynamic>.from(fetched);
          _loading = false;
          _error = null;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'No se pudo actualizar el detalle. Mostramos la última información disponible.';
      });
    }
  }

  Future<void> _call() async {
    final phone = OrderInfo.customerPhone(_order);
    if (phone == null) return;
    await launchUrl(Uri.parse('tel:$phone'));
  }

  Future<void> _openMaps() async {
    final address = OrderInfo.address(_order);
    if (address.isEmpty) return;
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir el mapa'), behavior: SnackBarBehavior.floating),
      );
    }
  }

  Future<void> _openDelivery() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => DeliveryDetailScreen(order: _order)),
    );
    if (mounted) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final status = _order['status']?.toString();
    final items = OrderInfo.items(_order);
    final phone = OrderInfo.customerPhone(_order);
    final email = OrderInfo.customerEmail(_order);
    final address = OrderInfo.address(_order);
    final pickup = OrderInfo.isPickup(_order);
    final notes = _order['notes']?.toString().trim();
    final history = _order['history'];
    final events = history is List
        ? history.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList()
        : <Map<String, dynamic>>[];
    events.sort((a, b) {
      final da = DateTime.tryParse('${a['created_at']}') ?? DateTime.fromMillisecondsSinceEpoch(0);
      final db = DateTime.tryParse('${b['created_at']}') ?? DateTime.fromMillisecondsSinceEpoch(0);
      return db.compareTo(da);
    });

    return Scaffold(
      appBar: AppBar(title: Text(_order['order_number']?.toString() ?? 'Pedido')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_error != null) ...[
              ErrorBanner(message: _error!, onRetry: _refresh),
              const SizedBox(height: 12),
            ],
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: LinearProgressIndicator(minHeight: 2, color: AppColors.clay),
              ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            OrderInfo.customerName(_order),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                          ),
                        ),
                        StatusChip(label: statusLabel(status), tone: OrderInfo.statusColor(status)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(OrderInfo.formatDate(_order['created_at']), style: TextStyle(color: Colors.grey[700])),
                    if (phone != null) ...[
                      const SizedBox(height: 6),
                      Text(phone, style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                    if (email != null) ...[
                      const SizedBox(height: 2),
                      Text(email, style: TextStyle(color: Colors.grey[700])),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pickup ? 'Retiro' : 'Envío',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 6),
                    Text(OrderInfo.fulfillmentLabel(_order)),
                    if (address.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(address),
                    ],
                    const SizedBox(height: 10),
                    Text(
                      'Pago: ${OrderInfo.paymentLabel(_order['payment_method']?.toString())}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    if (notes != null && notes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('Nota: $notes', style: TextStyle(color: Colors.grey[800])),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Productos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            if (items.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Sin ítems en este resumen.', style: TextStyle(color: Colors.grey[700])),
                ),
              )
            else
              for (final item in items)
                Card(
                  child: ListTile(
                    title: Text(OrderInfo.itemLabel(item)),
                    subtitle: Text('${OrderInfo.money(item['unit_price'])} c/u'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('x${item['quantity']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text(OrderInfo.money(item['subtotal']), style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _TotalRow(label: 'Subtotal', value: OrderInfo.money(_order['subtotal'])),
                    if (_order['discount'] != null && (num.tryParse('${_order['discount']}') ?? 0) > 0)
                      _TotalRow(label: 'Descuento', value: '- ${OrderInfo.money(_order['discount'])}'),
                    if (_order['tax'] != null) _TotalRow(label: 'IGV', value: OrderInfo.money(_order['tax'])),
                    if (_order['shipping_cost'] != null)
                      _TotalRow(label: 'Envío', value: OrderInfo.money(_order['shipping_cost'])),
                    const Divider(height: 20),
                    _TotalRow(
                      label: 'Total',
                      value: OrderInfo.money(_order['total']),
                      emphasis: true,
                    ),
                  ],
                ),
              ),
            ),
            if (events.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('Seguimiento', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      for (var i = 0; i < events.length; i++) ...[
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.circle, size: 10, color: OrderInfo.statusColor(events[i]['status']?.toString())),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    statusLabel(events[i]['status']?.toString()),
                                    style: const TextStyle(fontWeight: FontWeight.w700),
                                  ),
                                  Text(
                                    OrderInfo.formatDate(events[i]['created_at'] ?? events[i]['changed_at']),
                                    style: TextStyle(color: Colors.grey[700], fontSize: 12),
                                  ),
                                  if ((events[i]['notes']?.toString().trim() ?? '').isNotEmpty)
                                    Text(events[i]['notes'].toString()),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (i != events.length - 1) const SizedBox(height: 12),
                      ],
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (phone != null)
              OutlinedButton.icon(
                onPressed: _call,
                icon: const Icon(Icons.call_outlined),
                label: const Text('Llamar al cliente'),
              ),
            if (!pickup && address.isNotEmpty) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _openMaps,
                icon: const Icon(Icons.map_outlined),
                label: const Text('Ver dirección en Maps'),
              ),
            ],
            if (OrderInfo.canDeliver(_order)) ...[
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: _openDelivery,
                icon: const Icon(Icons.local_shipping_outlined),
                label: const Text('Registrar entrega'),
              ),
            ],
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow({required this.label, required this.value, this.emphasis = false});

  final String label;
  final String value;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: emphasis ? FontWeight.w800 : FontWeight.w500,
      fontSize: emphasis ? 16 : 14,
      color: emphasis ? AppColors.clay : AppColors.ink,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}
