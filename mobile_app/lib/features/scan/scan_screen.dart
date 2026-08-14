import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key, required this.active});

  final bool active;

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> with SingleTickerProviderStateMixin {
  final _api = ApiClient();
  final _manual = TextEditingController();
  final _focus = FocusNode();
  late final MobileScannerController _scanner;
  late final AnimationController _line;

  bool _busy = false;
  bool _torch = false;
  String? _cameraError;
  List<dynamic> _matches = [];
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _scanner = MobileScannerController(
      autoStart: false,
      facing: kIsWeb ? CameraFacing.front : CameraFacing.back,
      detectionSpeed: DetectionSpeed.noDuplicates,
      detectionTimeoutMs: 900,
      formats: const [
        BarcodeFormat.ean13,
        BarcodeFormat.ean8,
        BarcodeFormat.code128,
        BarcodeFormat.code39,
        BarcodeFormat.upcA,
        BarcodeFormat.upcE,
        BarcodeFormat.qrCode,
      ],
    );
    _line = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);
    if (widget.active) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _startCamera());
    }
  }

  @override
  void didUpdateWidget(covariant ScanScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) {
      _startCamera();
    } else if (!widget.active && oldWidget.active) {
      _scanner.stop();
    }
  }

  Future<void> _startCamera() async {
    setState(() => _cameraError = null);
    try {
      await _scanner.start();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _cameraError = kIsWeb
            ? 'Permite la cámara en Chrome (candado de la barra de dirección) o busca el producto por SKU.'
            : 'No se pudo abrir la cámara. Revisa el permiso e inténtalo de nuevo.';
      });
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _manual.dispose();
    _focus.dispose();
    _line.dispose();
    _scanner.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () => _search(value));
  }

  Future<void> _search(String raw) async {
    final q = raw.trim();
    if (q.length < 2) {
      if (mounted) setState(() => _matches = []);
      return;
    }
    try {
      final res = await _api.get('/products?search=${Uri.encodeComponent(q)}&active=true&limit=8');
      final data = res is Map ? res['data'] : null;
      if (!mounted) return;
      setState(() => _matches = data is List ? data : []);
    } catch (_) {
      if (!mounted) return;
      setState(() => _matches = []);
    }
  }

  Future<void> _lookup(String code) async {
    final value = code.trim();
    if (value.isEmpty || _busy) return;
    setState(() => _busy = true);
    if (!kIsWeb) {
      try {
        await _scanner.stop();
      } catch (_) {}
    }
    try {
      final product = await _api.get('/products/lookup?code=${Uri.encodeComponent(value)}')
          as Map<String, dynamic>;
      if (!mounted) return;
      try {
        HapticFeedback.mediumImpact();
      } catch (_) {}
      _manual.text = value;
      setState(() => _matches = []);
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        backgroundColor: AppColors.cream,
        builder: (_) => _ProductSheet(product: product),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se encontró. Escribe el SKU o el nombre del producto.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        if (widget.active && !kIsWeb) {
          try {
            await _scanner.start();
          } catch (_) {}
        }
      }
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_busy || !widget.active) return;
    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue?.trim();
      if (raw != null && raw.isNotEmpty) {
        _lookup(raw);
        return;
      }
    }
  }

  Widget _camera(BuildContext context) {
    if (_cameraError != null) {
      return ColoredBox(
        color: AppColors.ink,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.videocam_off_outlined, color: Colors.white70, size: 48),
              const SizedBox(height: 12),
              Text(_cameraError!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 16),
              FilledButton(onPressed: _startCamera, child: const Text('Reintentar cámara')),
            ],
          ),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        MobileScanner(
          controller: _scanner,
          fit: BoxFit.cover,
          onDetect: _onDetect,
          errorBuilder: (context, error, child) {
            return ColoredBox(
              color: AppColors.ink,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.camera_alt_outlined, color: Colors.white70, size: 42),
                      const SizedBox(height: 12),
                      Text(
                        'Activa la cámara para escanear. En Chrome: candado → Cámara → Permitir.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(onPressed: _startCamera, child: const Text('Abrir cámara')),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        IgnorePointer(
          child: Center(
            child: SizedBox(
              width: 260,
              height: 180,
              child: AnimatedBuilder(
                animation: _line,
                builder: (context, _) {
                  return CustomPaint(
                    painter: _ScanFramePainter(progress: _line.value),
                  );
                },
              ),
            ),
          ),
        ),
        Positioned(
          top: 12,
          right: 12,
          child: Row(
            children: [
              _CamBtn(
                icon: _torch ? Icons.flash_on : Icons.flash_off,
                onTap: () async {
                  try {
                    await _scanner.toggleTorch();
                    if (mounted) setState(() => _torch = !_torch);
                  } catch (_) {}
                },
              ),
              const SizedBox(width: 8),
              _CamBtn(
                icon: Icons.cameraswitch_outlined,
                onTap: () async {
                  try {
                    await _scanner.switchCamera();
                  } catch (_) {}
                },
              ),
            ],
          ),
        ),
        if (_busy)
          const ColoredBox(
            color: Colors.black54,
            child: Center(child: CircularProgressIndicator(color: Colors.white)),
          ),
      ],
    );
  }

  Widget _searchPanel({required bool compact}) {
    return Container(
      color: AppColors.cream,
      padding: EdgeInsets.fromLTRB(16, compact ? 12 : 20, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _manual,
            focusNode: _focus,
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(
              hintText: 'Busca por nombre, SKU o código',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: _onQueryChanged,
            onSubmitted: _lookup,
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: () => _lookup(_manual.text),
            icon: const Icon(Icons.inventory_2_outlined),
            label: const Text('Consultar producto'),
          ),
          if (_matches.isNotEmpty) ...[
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _matches.length,
                itemBuilder: (_, i) {
                  final p = _matches[i] as Map<String, dynamic>;
                  return Card(
                    child: ListTile(
                      title: Text(p['name']?.toString() ?? '', maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text('SKU ${p['sku']} · S/ ${p['sale_price']}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _lookup(p['sku']?.toString() ?? p['barcode']?.toString() ?? ''),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 860;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Escanear producto'),
        actions: [
          if (kIsWeb)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Text(
                  'En PC puedes buscar por SKU',
                  style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 12),
                ),
              ),
            ),
        ],
      ),
      body: wide
          ? Row(
              children: [
                SizedBox(
                  width: 380,
                  child: SizedBox.expand(child: _searchPanel(compact: false)),
                ),
                Expanded(child: _camera(context)),
              ],
            )
          : Column(
              children: [
                Expanded(flex: 5, child: _camera(context)),
                Expanded(flex: _matches.isEmpty ? 2 : 3, child: _searchPanel(compact: true)),
              ],
            ),
    );
  }
}

class _CamBtn extends StatelessWidget {
  const _CamBtn({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black45,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, color: Colors.white),
        ),
      ),
    );
  }
}

class _ScanFramePainter extends CustomPainter {
  _ScanFramePainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final border = Paint()
      ..color = AppColors.clay
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    final rect = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(18));
    canvas.drawRRect(rect, border);

    final y = 16 + (size.height - 32) * progress;
    final line = Paint()
      ..color = AppColors.clay.withOpacity(0.9)
      ..strokeWidth = 2;
    canvas.drawLine(Offset(18, y), Offset(size.width - 18, y), line);
  }

  @override
  bool shouldRepaint(covariant _ScanFramePainter oldDelegate) => oldDelegate.progress != progress;
}

class _ProductSheet extends StatelessWidget {
  const _ProductSheet({required this.product});

  final Map<String, dynamic> product;

  @override
  Widget build(BuildContext context) {
    final stock = num.tryParse('${product['stock_quantity']}') ?? 0;
    final minStock = num.tryParse('${product['min_stock']}') ?? 0;
    final low = stock <= minStock;
    final images = product['images'];
    String? imageUrl;
    if (images is List && images.isNotEmpty && images.first is Map) {
      imageUrl = (images.first as Map)['url']?.toString();
    }
    final maxW = MediaQuery.sizeOf(context).width;

    return Padding(
      padding: EdgeInsets.fromLTRB(maxW > 600 ? 32 : 20, 8, maxW > 600 ? 32 : 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (imageUrl != null && imageUrl.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(imageUrl, height: 140, width: double.infinity, fit: BoxFit.cover),
            ),
          const SizedBox(height: 12),
          Text(
            product['name']?.toString() ?? 'Producto',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text('SKU ${product['sku'] ?? '—'}'),
          const SizedBox(height: 16),
          Row(
            children: [
              _Info(label: 'Precio', value: 'S/ ${product['sale_price']}', color: AppColors.clay),
              const SizedBox(width: 10),
              _Info(
                label: low ? 'Stock bajo' : 'Disponible',
                value: '$stock und.',
                color: low ? const Color(0xFFB42318) : AppColors.moss,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            low
                ? 'Avísale al cliente que queda poco. Revisa reposición en almacén.'
                : 'Puedes venderlo con confianza: hay unidades en tienda.',
            style: TextStyle(color: Colors.grey[700]),
          ),
        ],
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
          color: color.withOpacity(0.1),
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
