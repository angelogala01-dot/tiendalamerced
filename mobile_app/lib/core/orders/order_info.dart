import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/catalog/product_info.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';

class OrderInfo {
  OrderInfo._();

  static const activeStatuses = {
    'pending',
    'confirmed',
    'processing',
    'shipped',
  };

  static const statusFilters = <String?>[
    null,
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];

  static List<Map<String, dynamic>> asOrderList(dynamic raw) {
    if (raw is List) {
      return raw.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
    }
    if (raw is Map && raw['data'] is List) {
      return (raw['data'] as List)
          .whereType<Map>()
          .map((row) => Map<String, dynamic>.from(row))
          .toList();
    }
    return const [];
  }

  static Map<String, dynamic>? asMap(dynamic raw) {
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return null;
  }

  static String customerName(Map<String, dynamic> order) {
    final customer = asMap(order['customer']);
    final name = customer?['full_name']?.toString().trim();
    if (name != null && name.isNotEmpty) return name;
    return 'Cliente';
  }

  static String? customerPhone(Map<String, dynamic> order) {
    final phone = asMap(order['customer'])?['phone']?.toString().trim();
    if (phone == null || phone.isEmpty) return null;
    return phone;
  }

  static String? customerEmail(Map<String, dynamic> order) {
    final email = asMap(order['customer'])?['email']?.toString().trim();
    if (email == null || email.isEmpty) return null;
    return email;
  }

  static bool isPickup(Map<String, dynamic> order) {
    final method = order['fulfillment_method']?.toString().toLowerCase();
    if (method == 'pickup') return true;
    if (method == 'delivery') return false;
    return (order['shipping_city']?.toString() ?? '').toLowerCase().contains('retiro en tienda');
  }

  static String fulfillmentLabel(Map<String, dynamic> order) {
    return isPickup(order) ? 'Retiro en tienda' : 'Envío a domicilio';
  }

  static String address(Map<String, dynamic> order) {
    final street = order['shipping_address']?.toString().trim() ?? '';
    final city = order['shipping_city']?.toString().trim() ?? '';
    return [street, city].where((part) => part.isNotEmpty).join(', ');
  }

  static String paymentLabel(String? method) {
    switch (method) {
      case 'transfer':
        return 'Transferencia';
      case 'yape':
        return 'Yape';
      case 'plin':
        return 'Plin';
      case 'card':
        return 'Tarjeta';
      case 'cash':
        return 'Efectivo';
      default:
        return method == null || method.isEmpty ? '—' : method;
    }
  }

  static Color statusColor(String? status) {
    switch (status) {
      case 'confirmed':
      case 'delivered':
        return AppColors.moss;
      case 'shipped':
        return const Color(0xFF1D4E89);
      case 'cancelled':
        return const Color(0xFFB42318);
      case 'processing':
        return AppColors.clay;
      default:
        return AppColors.clay;
    }
  }

  static bool isActive(Map<String, dynamic> order) {
    return activeStatuses.contains(order['status']?.toString());
  }

  static bool canDeliver(Map<String, dynamic> order) {
    final status = order['status']?.toString();
    return status != null && activeStatuses.contains(status);
  }

  static List<Map<String, dynamic>> items(Map<String, dynamic> order) {
    final raw = order['items'];
    if (raw is! List) return const [];
    return raw.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
  }

  static int itemCount(Map<String, dynamic> order) {
    return items(order).fold<int>(0, (sum, item) {
      return sum + (num.tryParse('${item['quantity']}')?.toInt() ?? 0);
    });
  }

  static String itemLabel(Map<String, dynamic> item) {
    final product = asMap(item['product']);
    final name = product?['name']?.toString() ?? 'Producto';
    final variant = [
      if ((item['size']?.toString().trim() ?? '').isNotEmpty) 'Talla ${item['size']}',
      if ((item['color']?.toString().trim() ?? '').isNotEmpty) item['color'],
    ].join(' · ');
    return variant.isEmpty ? name : '$name · $variant';
  }

  static String formatDate(dynamic raw, {bool withTime = true}) {
    final parsed = DateTime.tryParse(raw?.toString() ?? '');
    if (parsed == null) return '—';
    final local = parsed.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    if (!withTime) return '$day/$month/${local.year}';
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$day/$month/${local.year} $hour:$minute';
  }

  static String money(dynamic value) => ProductInfo.money(value);

  static bool matchesQuery(Map<String, dynamic> order, String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    final number = order['order_number']?.toString().toLowerCase() ?? '';
    final name = customerName(order).toLowerCase();
    final phone = customerPhone(order)?.toLowerCase() ?? '';
    return number.contains(q) || name.contains(q) || phone.contains(q);
  }
}
