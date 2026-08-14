import 'package:flutter/material.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/auth/auth_controller.dart';
import 'package:la_merced_mobile/features/deliveries/deliveries_screen.dart';
import 'package:la_merced_mobile/features/home/home_screen.dart';
import 'package:la_merced_mobile/features/notifications/notifications_screen.dart';
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
  int _homeNonce = 0;

  @override
  void initState() {
    super.initState();
    _refreshUnread();
  }

  Future<void> _refreshUnread() async {
    try {
      final data = await _api.get('/notifications/unread-count') as Map<String, dynamic>;
      if (!mounted) return;
      setState(() => _unread = (data['count'] as num?)?.toInt() ?? 0);
    } catch (_) {}
  }

  void _go(int i) {
    setState(() {
      _index = i;
      if (i == 0) _homeNonce++;
    });
    if (i == 0 || i == 3) _refreshUnread();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        key: ValueKey(_homeNonce),
        auth: widget.auth,
        unread: _unread,
        onOpenScan: () => _go(1),
        onOpenDeliveries: () => _go(2),
        onOpenAlerts: () => _go(3),
      ),
      ScanScreen(active: _index == 1),
      const DeliveriesScreen(),
      NotificationsScreen(onChanged: _refreshUnread),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _go,
        height: MediaQuery.sizeOf(context).width < 400 ? 64 : 72,
        labelBehavior: MediaQuery.sizeOf(context).width < 360
            ? NavigationDestinationLabelBehavior.onlyShowSelected
            : NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Inicio'),
          const NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'Escanear'),
          const NavigationDestination(icon: Icon(Icons.local_shipping_outlined), selectedIcon: Icon(Icons.local_shipping), label: 'Entregas'),
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
