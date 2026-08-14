import 'package:flutter/material.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pedidos')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Consulta el estado de pedidos con tu número de orden.\n\n'
            'API: GET /api/v1/orders/track/:orderNumber',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
