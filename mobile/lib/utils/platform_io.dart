import 'dart:io' show Platform;

bool get isAndroidPlatform => Platform.isAndroid;

bool get isMobileNativePlatform => Platform.isAndroid || Platform.isIOS;
