import 'package:ota_update/ota_update.dart';

import '../models/app_update_info.dart';
import 'ota_install_stub.dart' show OtaInstallEvent;

Stream<OtaInstallEvent> installApkUpdate(AppUpdateInfo info) async* {
  await for (final event in OtaUpdate().execute(
    info.apkUrl,
    destinationFilename: 'drosi-update.apk',
  )) {
    yield OtaInstallEvent(
      status: event.status.toString().split('.').last,
      value: event.value,
    );
  }
}
