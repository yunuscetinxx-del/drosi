import 'json_utils.dart';
import 'lesson_image.dart';
import 'mind_map.dart';
import 'word_page.dart';

/// نموذج الدرس — مطابق لـ types/lesson.ts في الموقع.
///
/// مهم: نحافظ على الحقول غير المعروفة في [_extra] حتى لا يفقد التطبيق
/// أي بيانات أنشأها الموقع عند الحفظ عبر PUT /api/lessons.
class Lesson {
  Lesson({
    required this.id,
    required this.title,
    required this.subject,
    required this.description,
    required this.summary,
    required this.keyPoints,
    required this.notes,
    required this.images,
    required this.wordPages,
    required this.mindMaps,
    required this.mindMapFolders,
    required this.createdAt,
    required this.updatedAt,
    Map<String, dynamic>? extra,
  }) : _extra = extra ?? const {};

  final String id;
  String title;
  String subject;
  String description;
  String summary;
  List<String> keyPoints;
  String notes;
  List<LessonImage> images;
  List<WordPage> wordPages;
  List<MindMap> mindMaps;
  List<MindMapFolder> mindMapFolders;
  final DateTime createdAt;
  DateTime updatedAt;

  final Map<String, dynamic> _extra;

  factory Lesson.fromJson(Map<String, dynamic> json) {
    const known = {
      'id', 'title', 'subject', 'description', 'summary', 'keyPoints',
      'notes', 'images', 'wordPages', 'mindMaps', 'mindMapFolders',
      'createdAt', 'updatedAt',
    };
    final extra = <String, dynamic>{};
    json.forEach((key, value) {
      if (!known.contains(key)) extra[key] = value;
    });

    return Lesson(
      id: json['id']?.toString() ?? newId(),
      title: json['title']?.toString() ?? '',
      subject: json['subject']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      keyPoints: asStringList(json['keyPoints']),
      notes: json['notes']?.toString() ?? '',
      images: (json['images'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(LessonImage.fromJson)
          .toList(),
      wordPages: (json['wordPages'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(WordPage.fromJson)
          .toList(),
      mindMaps: (json['mindMaps'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MindMap.fromJson)
          .toList(),
      mindMapFolders: (json['mindMapFolders'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MindMapFolder.fromJson)
          .toList(),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDate(json['updatedAt']),
      extra: extra,
    );
  }

  Map<String, dynamic> toJson() => {
        ..._extra,
        'id': id,
        'title': title,
        'subject': subject,
        'description': description,
        'summary': summary,
        'keyPoints': keyPoints,
        'notes': notes,
        'images': images.map((e) => e.toJson()).toList(),
        'wordPages': wordPages.map((e) => e.toJson()).toList(),
        'mindMaps': mindMaps.map((e) => e.toJson()).toList(),
        'mindMapFolders': mindMapFolders.map((e) => e.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  Lesson copyWith({
    String? title,
    String? subject,
    String? description,
    String? summary,
    List<String>? keyPoints,
    String? notes,
    List<LessonImage>? images,
    List<WordPage>? wordPages,
    List<MindMap>? mindMaps,
    List<MindMapFolder>? mindMapFolders,
    DateTime? updatedAt,
  }) {
    return Lesson(
      id: id,
      title: title ?? this.title,
      subject: subject ?? this.subject,
      description: description ?? this.description,
      summary: summary ?? this.summary,
      keyPoints: keyPoints ?? this.keyPoints,
      notes: notes ?? this.notes,
      images: images ?? this.images,
      wordPages: wordPages ?? this.wordPages,
      mindMaps: mindMaps ?? this.mindMaps,
      mindMapFolders: mindMapFolders ?? this.mindMapFolders,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      extra: _extra,
    );
  }
}

class AuthUser {
  AuthUser({required this.email, required this.isAdmin});
  final String email;
  final bool isAdmin;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        email: json['email']?.toString() ?? '',
        isAdmin: json['isAdmin'] as bool? ?? false,
      );
}
