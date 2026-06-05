/// معلومات تحديث التطبيق من السيرفر (mobile-update.json).
class AppUpdateInfo {
  AppUpdateInfo({
    required this.version,
    required this.buildNumber,
    required this.changelog,
    required this.apkUrl,
    this.releasedAt,
    this.mandatory = false,
    this.minBuildNumber = 0,
  });

  final String version;
  final int buildNumber;
  final String changelog;
  final String apkUrl;
  final String? releasedAt;
  final bool mandatory;
  final int minBuildNumber;

  bool get hasApk => apkUrl.trim().isNotEmpty;

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      version: json['version']?.toString() ?? '0.0.0',
      buildNumber: _asInt(json['buildNumber']),
      changelog: json['changelog']?.toString() ?? '',
      apkUrl: json['apkUrl']?.toString() ?? '',
      releasedAt: json['releasedAt']?.toString(),
      mandatory: json['mandatory'] as bool? ?? false,
      minBuildNumber: _asInt(json['minBuildNumber']),
    );
  }

  static int _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v?.toString() ?? '') ?? 0;
  }
}
