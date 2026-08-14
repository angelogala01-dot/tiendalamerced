import 'package:flutter/material.dart';

class AppColors {
  static const ink = Color(0xFF1C1410);
  static const clay = Color(0xFFC45C26);
  static const sand = Color(0xFFF6EFE8);
  static const cream = Color(0xFFFFFBF7);
  static const moss = Color(0xFF3D6B4F);
}

class AppTheme {
  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.clay,
      primary: AppColors.clay,
      surface: AppColors.cream,
      brightness: Brightness.light,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.sand,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: AppColors.clay.withOpacity(0.15),
        labelTextStyle: MaterialStateProperty.resolveWith((states) {
          final selected = states.contains(MaterialState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AppColors.clay : Colors.black54,
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.clay,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.black.withOpacity(0.08)),
        ),
      ),
    );
  }
}

String greetingForNow() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

String roleLabel(String? role) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'Administración';
    case 'manager':
      return 'Supervisión';
    case 'seller':
      return 'Ventas';
    case 'warehouse':
      return 'Almacén';
    default:
      return 'Equipo';
  }
}

String statusLabel(String? status) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'confirmed':
      return 'Confirmado';
    case 'processing':
      return 'Preparando';
    case 'shipped':
      return 'En camino';
    case 'delivered':
      return 'Entregado';
    default:
      return status ?? '';
  }
}
