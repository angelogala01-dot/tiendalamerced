import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/features/orders/order_detail_screen.dart';
import 'package:la_merced_mobile/features/products/product_sheet.dart';

Future<void> showProductSheet(BuildContext context, Map<String, dynamic> product) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    backgroundColor: AppColors.cream,
    builder: (_) => ProductSheet(product: product),
  );
}

Future<T?> _withLoading<T>(BuildContext context, Future<T> Function() work) async {
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const Center(child: CircularProgressIndicator(color: AppColors.clay)),
  );
  try {
    return await work();
  } finally {
    if (context.mounted) Navigator.of(context, rootNavigator: true).pop();
  }
}

Future<void> openProductById(
  BuildContext context, {
  String? id,
  String? sku,
  Map<String, dynamic>? product,
}) async {
  var data = product;
  if (data == null || data['variants'] == null) {
    try {
      data = await _withLoading<Map<String, dynamic>?>(context, () async {
        final api = ApiClient();
        if (id != null && id.isNotEmpty) {
          final fetched = await api.get('/products/$id', cache: false);
          if (fetched is Map) return Map<String, dynamic>.from(fetched);
        } else if (sku != null && sku.isNotEmpty) {
          final fetched = await api.get(
            '/products/lookup?code=${Uri.encodeComponent(sku)}',
            cache: false,
          );
          if (fetched is Map) return Map<String, dynamic>.from(fetched);
        }
        return null;
      });
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
      return;
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo abrir el producto.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
  }

  if (!context.mounted || data == null) return;
  await showProductSheet(context, data);
}

Future<void> openOrderById(
  BuildContext context, {
  String? id,
  Map<String, dynamic>? order,
}) async {
  var data = order;
  final orderId = id ?? data?['id']?.toString();
  if (data == null || data['items'] == null || data['customer'] == null) {
    if (orderId == null || orderId.isEmpty) return;
    try {
      final fetched = await _withLoading(
        context,
        () => ApiClient().get('/orders/$orderId', cache: false),
      );
      if (!context.mounted) return;
      if (fetched is Map) {
        data = Map<String, dynamic>.from(fetched);
      }
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
      return;
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo abrir el pedido.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
  }

  if (!context.mounted || data == null) return;
  await Navigator.of(context).push(
    MaterialPageRoute(builder: (_) => OrderDetailScreen(order: data!)),
  );
}

Future<void> openDeliveryById(BuildContext context, String orderId) {
  return openOrderById(context, id: orderId);
}
