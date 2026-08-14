import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:la_merced_mobile/core/auth/auth_controller.dart';
import 'package:la_merced_mobile/core/config.dart';
import 'package:la_merced_mobile/core/theme/app_theme.dart';
import 'package:la_merced_mobile/features/home/home_shell.dart';
import 'package:la_merced_mobile/features/login/login_screen.dart';

final authProvider = ChangeNotifierProvider<AuthController>((ref) {
  final auth = AuthController();
  auth.restore();
  return auth;
});

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );
  runApp(const ProviderScope(child: LaMercedApp()));
}

class LaMercedApp extends ConsumerWidget {
  const LaMercedApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    return MaterialApp(
      title: 'La Merced PyK',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: auth.loading && !auth.isLoggedIn
          ? const Scaffold(
              backgroundColor: Color(0xFF1C1410),
              body: Center(child: CircularProgressIndicator(color: Color(0xFFC45C26))),
            )
          : auth.isLoggedIn
              ? HomeShell(auth: auth)
              : LoginScreen(auth: auth),
    );
  }
}
