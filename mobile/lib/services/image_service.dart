import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';

/// خدمة التقاط الصور وتحويلها إلى Base64 DataURL — نفس تنسيق التخزين في الموقع.
class ImageService {
  final ImagePicker _picker = ImagePicker();

  /// التقاط صورة من الكاميرا وإرجاعها كـ data URL مضغوط.
  Future<String?> captureFromCamera() async {
    final file = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (file == null) return null;
    return _toDataUrl(file);
  }

  /// اختيار صورة واحدة من المعرض.
  Future<String?> pickFromGallery() async {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (file == null) return null;
    return _toDataUrl(file);
  }

  /// اختيار عدة صور من المعرض دفعة واحدة.
  Future<List<String>> pickMultipleFromGallery() async {
    final files = await _picker.pickMultiImage(
      maxWidth: 1600,
      imageQuality: 85,
    );
    final results = <String>[];
    for (final file in files) {
      final url = await _toDataUrl(file);
      if (url != null) results.add(url);
    }
    return results;
  }

  Future<String?> _toDataUrl(XFile file) async {
    final original = await file.readAsBytes();
    final compressed = await _compress(original, file.path);
    final base64Str = base64Encode(compressed);
    final mime = _mimeFor(file.path);
    return 'data:$mime;base64,$base64Str';
  }

  /// ضغط إضافي لتقليل حجم الـ JSON المخزّن. يعيد الأصل عند الفشل.
  Future<Uint8List> _compress(Uint8List bytes, String path) async {
    try {
      final lower = path.toLowerCase();
      final format = lower.endsWith('.png')
          ? CompressFormat.png
          : CompressFormat.jpeg;
      final result = await FlutterImageCompress.compressWithList(
        bytes,
        minWidth: 1600,
        minHeight: 1600,
        quality: 78,
        format: format,
      );
      // إن لم يُجدِ الضغط نفعاً، نُبقي الأصغر.
      return result.lengthInBytes < bytes.lengthInBytes ? result : bytes;
    } catch (e) {
      debugPrint('image compress failed: $e');
      return bytes;
    }
  }

  String _mimeFor(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }
}
