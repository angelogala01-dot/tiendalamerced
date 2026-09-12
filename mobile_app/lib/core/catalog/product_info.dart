enum StockAvailability { all, available, low, out }

class ProductInfo {
  ProductInfo._();

  static List<Map<String, dynamic>> activeVariants(Map<String, dynamic> product) {
    final raw = product['variants'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .where((row) => row['is_active'] != false)
        .toList();
  }

  static Map<String, dynamic>? matchedVariant(Map<String, dynamic> product) {
    final raw = product['matched_variant'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return null;
  }

  static String variantLabel(Map<String, dynamic> variant) {
    final size = variant['size']?.toString().trim();
    final color = variant['color']?.toString().trim();
    return [
      if (size != null && size.isNotEmpty) 'Talla $size',
      if (color != null && color.isNotEmpty) color,
    ].join(' · ');
  }

  static List<String> optionValues(List<Map<String, dynamic>> variants, String key) {
    final seen = <String>{};
    final values = <String>[];
    for (final variant in variants) {
      final value = variant[key]?.toString().trim() ?? '';
      if (value.isEmpty || seen.contains(value)) continue;
      seen.add(value);
      values.add(value);
    }
    return values;
  }

  static num stockOf(Map<String, dynamic> row) {
    return num.tryParse('${row['stock_quantity']}') ?? 0;
  }

  static num minStockOf(Map<String, dynamic> product) {
    return num.tryParse('${product['min_stock']}') ?? 0;
  }

  static num totalStock(Map<String, dynamic> product) {
    final variants = activeVariants(product);
    if (variants.isEmpty) return stockOf(product);
    return variants.fold<num>(0, (sum, row) => sum + stockOf(row));
  }

  static bool isOutOfStock(Map<String, dynamic> product) => totalStock(product) <= 0;

  static bool isLowStock(Map<String, dynamic> product) {
    final min = minStockOf(product);
    final variants = activeVariants(product);
    if (variants.isEmpty) return stockOf(product) <= min;
    return variants.any((variant) => stockOf(variant) <= min);
  }

  static bool matchesAvailability(Map<String, dynamic> product, StockAvailability filter) {
    switch (filter) {
      case StockAvailability.all:
        return true;
      case StockAvailability.available:
        return !isOutOfStock(product);
      case StockAvailability.low:
        return isLowStock(product);
      case StockAvailability.out:
        return isOutOfStock(product);
    }
  }

  static String stockBadge(Map<String, dynamic> product) {
    final stock = totalStock(product);
    if (stock <= 0) return 'Agotado';
    if (isLowStock(product)) return 'Stock bajo · ${stock.truncate()} uds';
    return '${stock.truncate()} uds';
  }

  static String? categoryName(Map<String, dynamic> product) {
    final category = product['category'];
    if (category is Map) {
      final name = category['name']?.toString().trim();
      if (name != null && name.isNotEmpty) return name;
    }
    return null;
  }

  static String? imageUrl(Map<String, dynamic> product) {
    final images = product['images'];
    if (images is! List || images.isEmpty) return null;
    Map<String, dynamic>? primary;
    for (final raw in images) {
      if (raw is! Map) continue;
      final image = Map<String, dynamic>.from(raw);
      if (image['is_primary'] == true) {
        primary = image;
        break;
      }
      primary ??= image;
    }
    final url = primary?['url']?.toString();
    if (url == null || url.isEmpty) return null;
    return url;
  }

  static String money(dynamic value) {
    final amount = num.tryParse('$value') ?? 0;
    return 'S/ ${amount.toStringAsFixed(2)}';
  }

  static Map<String, dynamic> notificationPayload(dynamic raw) {
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return const {};
  }
}
