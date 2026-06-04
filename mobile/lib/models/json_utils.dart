import 'package:uuid/uuid.dart';

const _uuid = Uuid();

/// معرّف عشوائي قصير مشابه لما يولّده الموقع.
String newId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  final raw = _uuid.v4().replaceAll('-', '');
  final buf = StringBuffer();
  for (var i = 0; i < 9; i++) {
    final code = raw.codeUnitAt(i % raw.length);
    buf.write(chars[code % chars.length]);
  }
  return buf.toString();
}

double asDouble(dynamic value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

DateTime asDate(dynamic value) {
  if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
  if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
  return DateTime.now();
}

List<String> asStringList(dynamic value) {
  if (value is List) return value.map((e) => e.toString()).toList();
  return const [];
}
