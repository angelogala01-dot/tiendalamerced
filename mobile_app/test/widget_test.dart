import 'package:flutter_test/flutter_test.dart';
import 'package:la_merced_mobile/core/catalog/product_info.dart';

void main() {
  test('variantLabel combina talla y color', () {
    expect(
      ProductInfo.variantLabel({'size': '38', 'color': 'Negro'}),
      'Talla 38 · Negro',
    );
  });

  test('activeVariants ignora inactivas', () {
    final product = {
      'variants': [
        {'id': '1', 'size': '38', 'is_active': true, 'stock_quantity': 2},
        {'id': '2', 'size': '39', 'is_active': false, 'stock_quantity': 4},
      ],
    };
    final variants = ProductInfo.activeVariants(product);
    expect(variants.length, 1);
    expect(variants.first['size'], '38');
  });

  test('notificationPayload lee el jsonb del aviso', () {
    final payload = ProductInfo.notificationPayload({
      'product_id': 'abc',
      'sku': 'ZAP-0001-NIK',
    });
    expect(payload['product_id'], 'abc');
    expect(ProductInfo.notificationPayload(null), isEmpty);
  });

  test('totalStock suma variantes activas', () {
    final product = {
      'stock_quantity': 99,
      'min_stock': 2,
      'variants': [
        {'size': '38', 'is_active': true, 'stock_quantity': 1},
        {'size': '39', 'is_active': true, 'stock_quantity': 4},
        {'size': '40', 'is_active': false, 'stock_quantity': 8},
      ],
    };
    expect(ProductInfo.totalStock(product), 5);
    expect(ProductInfo.isLowStock(product), isTrue);
    expect(ProductInfo.matchesAvailability(product, StockAvailability.low), isTrue);
    expect(ProductInfo.matchesAvailability(product, StockAvailability.out), isFalse);
  });

  test('stockBadge marca agotado', () {
    expect(ProductInfo.stockBadge({'stock_quantity': 0, 'min_stock': 2}), 'Agotado');
    expect(ProductInfo.stockBadge({'stock_quantity': 8, 'min_stock': 2}), '8 uds');
  });
}
