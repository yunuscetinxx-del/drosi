import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

/// يعرض صورة الدرس سواء كانت data URL (Base64) أو رابط شبكة عادي.
class LessonImageView extends StatelessWidget {
  const LessonImageView({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
  });

  final String url;
  final BoxFit fit;
  final double? width;
  final double? height;

  static Uint8List? _decodeDataUrl(String url) {
    final comma = url.indexOf(',');
    if (comma == -1) return null;
    try {
      return base64Decode(url.substring(comma + 1));
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: const Icon(Icons.broken_image_outlined, color: Colors.grey),
    );

    if (url.startsWith('data:')) {
      final bytes = _decodeDataUrl(url);
      if (bytes == null) return placeholder;
      return Image.memory(
        bytes,
        fit: fit,
        width: width,
        height: height,
        gaplessPlayback: true,
        errorBuilder: (_, _, _) => placeholder,
      );
    }

    if (url.startsWith('http')) {
      return Image.network(
        url,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, _, _) => placeholder,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return SizedBox(
            width: width,
            height: height,
            child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        },
      );
    }

    return placeholder;
  }
}
