import 'json_utils.dart';

/// لوحة ألوان العُقد — مطابقة لـ lib/mind-map-node.ts في الموقع.
const List<int> kMindMapNodeColors = [
  0xFF3b82f6,
  0xFF8b5cf6,
  0xFF10b981,
  0xFFf59e0b,
  0xFFef4444,
  0xFF06b6d4,
  0xFFec4899,
  0xFF84cc16,
];

/// تحويل لون hex (مثل "#3b82f6") إلى قيمة ARGB.
int colorFromHex(String hex, {int fallback = 0xFF3b82f6}) {
  var value = hex.trim();
  if (value.startsWith('#')) value = value.substring(1);
  if (value.length == 6) value = 'FF$value';
  final parsed = int.tryParse(value, radix: 16);
  return parsed ?? fallback;
}

/// تحويل قيمة ARGB إلى hex بصيغة "#rrggbb".
String hexFromColor(int argb) {
  final rgb = argb & 0xFFFFFF;
  return '#${rgb.toRadixString(16).padLeft(6, '0')}';
}

enum MindMapNodeRole { main, branch }

class MindMapNode {
  MindMapNode({
    required this.id,
    required this.text,
    required this.x,
    required this.y,
    required this.parentId,
    required this.color,
    this.role,
    this.note,
    this.linkedMapId,
    this.linkedImageId,
    this.linkedWordPageId,
    this.linkedKeyPointIndex,
    Map<String, dynamic>? extra,
  }) : _extra = extra ?? const {};

  final String id;
  String text;
  double x;
  double y;
  String? parentId;
  String color;
  MindMapNodeRole? role;
  String? note;
  String? linkedMapId;
  String? linkedImageId;
  String? linkedWordPageId;
  int? linkedKeyPointIndex;

  /// أي حقول إضافية غير معروفة نحافظ عليها لتوافق المستقبل.
  final Map<String, dynamic> _extra;

  MindMapNodeRole get resolvedRole {
    if (role != null) return role!;
    return (parentId != null && parentId!.isNotEmpty)
        ? MindMapNodeRole.branch
        : MindMapNodeRole.main;
  }

  factory MindMapNode.fromJson(Map<String, dynamic> json) {
    final known = {
      'id', 'text', 'x', 'y', 'parentId', 'color', 'role', 'note',
      'linkedMapId', 'linkedImageId', 'linkedWordPageId', 'linkedKeyPointIndex',
    };
    final extra = <String, dynamic>{};
    json.forEach((key, value) {
      if (!known.contains(key)) extra[key] = value;
    });

    MindMapNodeRole? role;
    final rawRole = json['role']?.toString();
    if (rawRole == 'main') role = MindMapNodeRole.main;
    if (rawRole == 'branch') role = MindMapNodeRole.branch;

    return MindMapNode(
      id: json['id']?.toString() ?? newId(),
      text: json['text']?.toString() ?? '',
      x: asDouble(json['x']),
      y: asDouble(json['y']),
      parentId: json['parentId']?.toString(),
      color: json['color']?.toString() ?? '#3b82f6',
      role: role,
      note: json['note']?.toString(),
      linkedMapId: json['linkedMapId']?.toString(),
      linkedImageId: json['linkedImageId']?.toString(),
      linkedWordPageId: json['linkedWordPageId']?.toString(),
      linkedKeyPointIndex: json['linkedKeyPointIndex'] is num
          ? (json['linkedKeyPointIndex'] as num).toInt()
          : null,
      extra: extra,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      ..._extra,
      'id': id,
      'text': text,
      'x': x,
      'y': y,
      'parentId': parentId,
      'color': color,
      if (role != null) 'role': role == MindMapNodeRole.main ? 'main' : 'branch',
      if (note != null) 'note': note,
      if (linkedMapId != null) 'linkedMapId': linkedMapId,
      if (linkedImageId != null) 'linkedImageId': linkedImageId,
      if (linkedWordPageId != null) 'linkedWordPageId': linkedWordPageId,
      if (linkedKeyPointIndex != null) 'linkedKeyPointIndex': linkedKeyPointIndex,
    };
  }
}

class MindMap {
  MindMap({
    required this.id,
    required this.title,
    required this.nodes,
    required this.saved,
    this.folderId,
    required this.createdAt,
    required this.updatedAt,
    Map<String, dynamic>? extra,
  }) : _extra = extra ?? const {};

  final String id;
  String title;
  List<MindMapNode> nodes;
  bool saved;
  String? folderId;
  final DateTime createdAt;
  DateTime updatedAt;
  final Map<String, dynamic> _extra;

  factory MindMap.fromJson(Map<String, dynamic> json) {
    final known = {
      'id', 'title', 'nodes', 'saved', 'folderId', 'createdAt', 'updatedAt',
    };
    final extra = <String, dynamic>{};
    json.forEach((key, value) {
      if (!known.contains(key)) extra[key] = value;
    });

    return MindMap(
      id: json['id']?.toString() ?? newId(),
      title: json['title']?.toString() ?? 'خريطة',
      nodes: (json['nodes'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MindMapNode.fromJson)
          .toList(),
      saved: json['saved'] as bool? ?? false,
      folderId: json['folderId']?.toString(),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDate(json['updatedAt']),
      extra: extra,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      ..._extra,
      'id': id,
      'title': title,
      'nodes': nodes.map((n) => n.toJson()).toList(),
      'saved': saved,
      'folderId': folderId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class MindMapFolder {
  MindMapFolder({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    Map<String, dynamic>? extra,
  }) : _extra = extra ?? const {};

  final String id;
  String title;
  final DateTime createdAt;
  DateTime updatedAt;
  final Map<String, dynamic> _extra;

  factory MindMapFolder.fromJson(Map<String, dynamic> json) {
    final known = {'id', 'title', 'createdAt', 'updatedAt'};
    final extra = <String, dynamic>{};
    json.forEach((key, value) {
      if (!known.contains(key)) extra[key] = value;
    });
    return MindMapFolder(
      id: json['id']?.toString() ?? newId(),
      title: json['title']?.toString() ?? 'مجلد',
      createdAt: asDate(json['createdAt']),
      updatedAt: asDate(json['updatedAt']),
      extra: extra,
    );
  }

  Map<String, dynamic> toJson() => {
        ..._extra,
        'id': id,
        'title': title,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}
