import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:la_merced_mobile/core/config.dart';

class ApiClient {
  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? AppConfig.apiUrl;

  final String baseUrl;

  static final Map<String, _CacheEntry> _cache = {};
  static const _ttl = Duration(seconds: 20);

  Future<Map<String, String>> _headers({bool json = true}) async {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    return {
      if (json) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<List<dynamic>> getList(String path, {bool cache = true}) async {
    final decoded = await get(path, cache: cache);
    if (decoded is List) return decoded;
    if (decoded is Map && decoded['data'] is List) {
      return decoded['data'] as List<dynamic>;
    }
    return [];
  }

  Future<dynamic> get(String path, {bool cache = true}) async {
    if (cache) {
      final hit = _cache[path];
      if (hit != null && DateTime.now().difference(hit.at) < _ttl) {
        return hit.data;
      }
    }

    final res = await http.get(Uri.parse('$baseUrl$path'), headers: await _headers());
    final decoded = _decode(res);
    if (cache) {
      _cache[path] = _CacheEntry(DateTime.now(), decoded);
    }
    return decoded;
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    _cache.clear();
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    _cache.clear();
    final res = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> uploadBytes(
    String path,
    List<int> bytes,
    String filename,
  ) async {
    _cache.clear();
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    final decoded = _decode(res);
    if (decoded is Map<String, dynamic>) return decoded;
    throw ApiException(res.statusCode, 'Respuesta inválida al subir archivo');
  }

  dynamic _decode(http.Response res) {
    final decoded = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final raw = decoded is Map ? decoded['message'] : null;
      final message = raw is List
          ? raw.join('. ')
          : raw is String
              ? raw
              : 'Error ${res.statusCode}';
      throw ApiException(res.statusCode, message);
    }
    return decoded;
  }
}

class _CacheEntry {
  _CacheEntry(this.at, this.data);
  final DateTime at;
  final dynamic data;
}

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;

  @override
  String toString() => message;
}
