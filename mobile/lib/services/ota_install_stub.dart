import '../models/app_update_info.dart';

class OtaInstallEvent {
  OtaInstallEvent({required this.status, this.value});
  final String status;
  final String? value;
}

Stream<OtaInstallEvent> installApkUpdate(AppUpdateInfo info) async* {
  throw UnsupportedError('APK install is not available on web');
}
