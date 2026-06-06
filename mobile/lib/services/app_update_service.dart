import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../config/api_config.dart';
import '../models/app_update_info.dart';
import '../utils/platform_info.dart';

/// يتحقق من mobile-update.json على السيرفر ويثبّت APK على أندرويد.
class AppUpdateService {
  AppUpdateService({Dio? dio}) : _dio = dio ?? Dio();

  final Dio _dio;

  static const skippedBuildKey = 'skipped_update_build';

  Future<PackageInfo> packageInfo() => PackageInfo.fromPlatform();

  String updateManifestUrl() {
    final base = ApiConfig.baseUrl.replaceAll(RegExp(r'/$'), '');
    return '$base/mobile-update.json';
  }

  /// يُرجع معلومات التحديث إن كان buildNumber على السيرفر أحدث من المثبّت.
  Future<AppUpdateInfo?> checkForUpdate() async {
    if (kIsWeb || !isAndroidPlatform) return null;

    final pkg = await packageInfo();
    final currentBuild = int.tryParse(pkg.buildNumber) ?? 0;

    final remote = await _fetchManifest();
    if (remote == null) return null;
    if (!remote.hasApk) return null;
    if (remote.buildNumber <= currentBuild) return null;
    if (currentBuild < remote.minBuildNumber) return remote;

    return remote;
  }

  Future<AppUpdateInfo?> _fetchManifest() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        updateManifestUrl(),
        options: Options(
          responseType: ResponseType.json,
          sendTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
        ),
      );
      final data = res.data;
      if (data == null) return null;
      return AppUpdateInfo.fromJson(data);
    } catch (_) {
      return null;
    }
  }
}
