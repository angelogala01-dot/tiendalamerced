import 'package:flutter/foundation.dart';

class AppConfig {
  static const supabaseUrl = 'https://idbzttrtzmhrlwsomphz.supabase.co';
  static const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnp0dHJ0em1ocmx3c29tcGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzcwNTQsImV4cCI6MjA5NzcxMzA1NH0.EFzdkWsxzhE7zXeO_eWxyO3D4BIWaFXWfuOE4oVdnyw';

  static const staffRoles = {
    'super_admin',
    'admin',
    'manager',
    'seller',
    'warehouse',
  };

  /// Chrome/web → localhost. Emulador Android → 10.0.2.2.
  /// Teléfono físico: flutter run --dart-define=API_URL=http://IP_DE_TU_PC:4000/api/v1
  static String get apiUrl {
    const fromEnv = String.fromEnvironment('API_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (kIsWeb) return 'http://localhost:4000/api/v1';
    return 'http://10.0.2.2:4000/api/v1';
  }
}
