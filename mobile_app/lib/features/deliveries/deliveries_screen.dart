import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/core/widgets/ui_bits.dart';

class DeliveriesScreen extends StatefulWidget {
  const DeliveriesScreen({super.key});

  @override
  State<DeliveriesScreen> createState() => _DeliveriesScreenState();
}

class _DeliveriesScreenState extends State<DeliveriesScreen> {
  final _api = ApiClient();
  List<dynamic> _orders = [];
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
      final data = await _api.get('/orders/deliveries');
      setState(() {
        _orders = data is List ? data : [];
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Entregas${_loading ? '' : ' (${_orders.length})'}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? EmptyState(
                  icon: Icons.wifi_off,
                  title: 'No se pudieron cargar',
                  subtitle: _error!,
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _orders.isEmpty
                      ? const EmptyState(
                          icon: Icons.local_shipping_outlined,
                          title: 'Sin entregas ahora',
                          subtitle: 'Cuando un pedido esté listo para salir, aparecerá aquí.',
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _orders.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) {
                            final order = _orders[i] as Map<String, dynamic>;
                            final customer = order['customer'];
                            final name = customer is Map
                                ? customer['full_name']?.toString() ?? 'Cliente'
                                : 'Cliente';
                            final status = order['status']?.toString();
                            return Card(
                              child: InkWell(
                                borderRadius: BorderRadius.circular(18),
                                onTap: () async {
                                  await Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => DeliveryDetailScreen(order: order),
                                    ),
                                  );
                                  _load();
                                },
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              order['order_number']?.toString() ?? '',
                                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                            ),
                                          ),
                                          StatusChip(
                                            label: statusLabel(status),
                                            tone: status == 'shipped' ? AppColors.moss : AppColors.clay,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                      Text(
                                        '${order['shipping_address'] ?? 'Sin dirección'}'
                                        '${order['shipping_city'] != null ? ', ${order['shipping_city']}' : ''}',
                                        style: TextStyle(color: Colors.grey[700]),
                                      ),
                                      const SizedBox(height: 8),
                                      Text('Toca para ver ruta, llamar y marcar entregado', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class DeliveryDetailScreen extends StatefulWidget {
  const DeliveryDetailScreen({super.key, required this.order});

  final Map<String, dynamic> order;

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  final _api = ApiClient();
  final _notes = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Map<String, dynamic>? get _customer {
    final c = widget.order['customer'];
    return c is Map<String, dynamic> ? c : null;
  }

  String get _address {
    final street = widget.order['shipping_address']?.toString() ?? '';
    final city = widget.order['shipping_city']?.toString() ?? '';
    return [street, city].where((p) => p.isNotEmpty).join(', ');
  }

  Future<void> _openMaps() async {
    if (_address.isEmpty) return;
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(_address)}');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo abrir el mapa')));
    }
  }

  Future<void> _call() async {
    final phone = _customer?['phone']?.toString() ?? '';
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    await launchUrl(uri);
  }

  Future<void> _deliver() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Confirmar entrega?'),
        content: const Text('Puedes tomar una foto como evidencia. El pedido pasará a entregado.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ahora no')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Continuar')),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _saving = true);
    try {
      String? photoUrl;
      final picked = await ImagePicker().pickImage(
        source: ImageSource.camera,
        maxWidth: 1600,
        imageQuality: 75,
      );
      if (picked != null) {
        final uploaded = await _api.uploadBytes(
          '/upload/delivery-photo',
          await picked.readAsBytes(),
          picked.name,
        );
        photoUrl = uploaded['url']?.toString();
      }
      await _api.post('/orders/${widget.order['id']}/deliver', {
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        if (photoUrl != null) 'photo_url': photoUrl,
      });
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: AppColors.moss, size: 48),
          title: const Text('¡Entregado!'),
          content: Text('${widget.order['order_number']} quedó registrado como entregado.'),
          actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Listo'))],
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo marcar la entrega')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.order['items'];
    final list = items is List ? items : [];
    final phone = _customer?['phone']?.toString();

    return Scaffold(
      appBar: AppBar(title: Text(widget.order['order_number']?.toString() ?? 'Entrega')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_customer?['full_name']?.toString() ?? 'Cliente',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(_address.isEmpty ? 'Sin dirección de envío' : _address),
                  if (phone != null && phone.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(phone, style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                  const SizedBox(height: 12),
                  StatusChip(label: statusLabel(widget.order['status']?.toString())),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text('Productos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ...list.map((raw) {
            final item = raw as Map<String, dynamic>;
            final product = item['product'];
            final name = product is Map ? product['name'] : 'Producto';
            return Card(
              child: ListTile(
                title: Text(name?.toString() ?? 'Producto'),
                trailing: Text('x${item['quantity']}', style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
            );
          }),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Nota para el equipo (opcional)',
              hintText: 'Ej. dejó con el vecino, pagó contraentrega…',
            ),
          ),
          const SizedBox(height: 16),
          if (phone != null && phone.isNotEmpty)
            OutlinedButton.icon(
              onPressed: _call,
              icon: const Icon(Icons.call_outlined),
              label: const Text('Llamar al cliente'),
            ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _address.isEmpty ? null : _openMaps,
            icon: const Icon(Icons.map_outlined),
            label: const Text('Abrir ruta en Maps'),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _saving ? null : _deliver,
            icon: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.camera_alt_outlined),
            label: const Text('Foto y marcar entregado'),
          ),
        ],
      ),
    );
  }
}
