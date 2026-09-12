import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/auth/auth_controller.dart';
import 'package:la_merced_mobile/core/catalog/product_info.dart';
import 'package:la_merced_mobile/features/home/home_screen.dart';
import 'package:la_merced_mobile/features/notifications/notifications_screen.dart';
import 'package:la_merced_mobile/features/orders/orders_screen.dart';
import 'package:la_merced_mobile/features/products/products_screen.dart';
import 'package:la_merced_mobile/features/scan/scan_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.auth});

  final AuthController auth;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  final _api = ApiClient();
  int _index = 0;
  int _unread = 0;
  StockAvailability _stockFilter = StockAvailability.all;
  String? _orderStatus;
  int _stockNonce = 0;
  int _ordersNonce = 0;

  @override
  void initState() {
    super.initState();
    _refreshUnread();
  }

  Future<void> _refreshUnread() async {
    try {
      final data = await _api.get('/notifications/unread-count', cache: false) as Map<String, dynamic>;
      if (!mounted) return;
      final count = (data['count'] as num?)?.toInt() ?? 0;
      if (count != _unread) setState(() => _unread = count);
    } catch (_) {}
  }

  void _go(int i, {StockAvailability? stockFilter, String? orderStatus, bool resetOrderStatus = false}) {
    setState(() {
      _index = i;
      if (stockFilter != null) {
        _stockFilter = stockFilter;
        _stockNonce++;
      }
      if (resetOrderStatus) {
        _orderStatus = null;
        _ordersNonce++;
      } else if (orderStatus != null) {
        _orderStatus = orderStatus;
        _ordersNonce++;
      }
    });
    if (i == 3) _refreshUnread();
  }

  void _openScan() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ScanScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;

    return Scaffold(
      body: IndexedStack(
        index: _index,
        sizing: StackFit.expand,
        children: [
          HomeScreen(
            key: const ValueKey('home'),
            auth: widget.auth,
            unread: _unread,
            onOpenScan: _openScan,
            onOpenStock: ([filter]) => _go(1, stockFilter: filter ?? StockAvailability.all),
            onOpenOrders: ([status]) => _go(
              2,
              orderStatus: status,
              resetOrderStatus: status == null,
            ),
            onOpenAlerts: () => _go(3),
          ),
          ProductsScreen(
            key: ValueKey('stock-$_stockNonce-$_stockFilter'),
            initialFilter: _stockFilter,
          ),
          OrdersScreen(
            key: ValueKey('orders-$_ordersNonce-${_orderStatus ?? 'all'}'),
            initialStatus: _orderStatus,
          ),
          NotificationsScreen(key: const ValueKey('alerts'), onChanged: _refreshUnread),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => _go(i),
        animationDuration: const Duration(milliseconds: 120),
        height: width < 400 ? 64 : 72,
        labelBehavior: width < 360
            ? NavigationDestinationLabelBehavior.onlyShowSelected
            : NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Inicio'),
          const NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Stock',
          ),
          const NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Pedidos',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _unread > 0,
              label: Text('$_unread'),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: _unread > 0,
              label: Text('$_unread'),
              child: const Icon(Icons.notifications),
            ),
            label: 'Avisos',
          ),
        ],
      ),
    );
  }
}
