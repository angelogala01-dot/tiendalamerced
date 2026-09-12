import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:la_merced_mobile/core/api/api_client.dart';
import 'package:la_merced_mobile/core/config.dart';

class AuthController extends ChangeNotifier {
  AuthController({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;
  bool loading = true;
  String? error;
  Map<String, dynamic>? profile;

  bool get isLoggedIn =>
      Supabase.instance.client.auth.currentSession != null && profile != null;

  String get displayName =>
      (profile?['full_name'] as String?)?.split(' ').first ??
      (profile?['email'] as String?) ??
      'Equipo';

  Future<void> restore() async {
    loading = true;
    notifyListeners();
    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      try {
        await _loadProfile();
      } catch (_) {
        await Supabase.instance.client.auth.signOut();
        profile = null;
      }
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    error = null;
    try {
      final result = await Supabase.instance.client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      if (result.session == null || result.user == null) {
        throw ApiException(401, 'No se pudo iniciar sesión');
      }
      await _loadProfile(result.user!);
    } on AuthException catch (e) {
      error = _authMessage(e.message);
      profile = null;
    } on ApiException catch (e) {
      error = e.message;
      await Supabase.instance.client.auth.signOut();
      profile = null;
    } catch (e) {
      error = e.toString().replaceFirst('Exception: ', '');
      if (error!.length > 180) {
        error = 'No se pudo conectar con el servidor (${AppConfig.apiUrl}).';
      }
      profile = null;
    }
    notifyListeners();
  }

  Future<void> logout() async {
    await Supabase.instance.client.auth.signOut();
    profile = null;
    notifyListeners();
  }

  Future<void> requestPasswordReset(String email) async {
    await _api.post('/auth/forgot-password', {'email': email.trim().toLowerCase()});
  }

  Future<void> _loadProfile([User? user]) async {
    final uid = user?.id ?? Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) {
      throw ApiException(401, 'Sesión inválida');
    }

    Map<String, dynamic>? data;

    try {
      final me = await _api.get('/auth/me');
      if (me is Map<String, dynamic>) {
        data = me['profile'] as Map<String, dynamic>?;
      }
    } catch (_) {
      final row = await Supabase.instance.client
          .from('profiles')
          .select()
          .eq('id', uid)
          .maybeSingle();
      data = row;
    }

    if (data == null) {
      data = {
        'id': uid,
        'email': user?.email,
        'full_name': user?.userMetadata?['full_name'],
        'role': user?.appMetadata['role'] ?? user?.userMetadata?['role'],
      };
    }

    final role = data['role']?.toString();
    if (role == null || !AppConfig.staffRoles.contains(role)) {
      throw ApiException(403, 'Esta app es solo para el personal de tienda');
    }
    profile = data;
  }

  String _authMessage(String message) {
    final lower = message.toLowerCase();
    if (lower.contains('invalid login') || lower.contains('invalid credentials')) {
      return 'Correo o contraseña incorrectos';
    }
    if (lower.contains('email not confirmed')) {
      return 'El correo aún no está confirmado';
    }
    return message;
  }
}
