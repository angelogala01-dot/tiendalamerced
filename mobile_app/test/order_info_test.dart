import 'package:flutter_test/flutter_test.dart';
import 'package:la_merced_mobile/core/orders/order_info.dart';

void main() {
  final order = <String, dynamic>{
    'order_number': 'LM-1042',
    'status': 'processing',
    'total': 189.5,
    'fulfillment_method': 'pickup',
    'shipping_city': 'Retiro en tienda',
    'customer': {'full_name': 'Ana Pérez', 'phone': '987654321'},
    'items': [
      {
        'quantity': 2,
        'size': '38',
        'color': 'Negro',
        'product': {'name': 'Zapato escolar'},
      },
    ],
  };

  test('asOrderList lee data de Supabase o una lista', () {
    expect(OrderInfo.asOrderList({'data': [order]}).length, 1);
    expect(OrderInfo.asOrderList([order]).length, 1);
    expect(OrderInfo.asOrderList(null), isEmpty);
  });

  test('identifica retiro, cliente y búsqueda del vendedor', () {
    expect(OrderInfo.isPickup(order), isTrue);
    expect(OrderInfo.customerName(order), 'Ana Pérez');
    expect(OrderInfo.itemCount(order), 2);
    expect(OrderInfo.itemLabel(OrderInfo.items(order).first), 'Zapato escolar · Talla 38 · Negro');
    expect(OrderInfo.matchesQuery(order, '1042'), isTrue);
    expect(OrderInfo.matchesQuery(order, 'ana'), isTrue);
    expect(OrderInfo.matchesQuery(order, 'xyz'), isFalse);
    expect(OrderInfo.isActive(order), isTrue);
    expect(OrderInfo.canDeliver(order), isTrue);
  });

  test('envío a domicilio no se confunde con retiro', () {
    final delivery = <String, dynamic>{
      ...order,
      'fulfillment_method': 'delivery',
      'shipping_city': 'Huánuco',
      'shipping_address': 'Jr. Dos de Mayo 120',
    };
    expect(OrderInfo.isPickup(delivery), isFalse);
    expect(OrderInfo.fulfillmentLabel(delivery), 'Envío a domicilio');
    expect(OrderInfo.address(delivery), 'Jr. Dos de Mayo 120, Huánuco');
  });
}
