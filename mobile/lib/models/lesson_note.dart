import 'json_utils.dart';

/// ملاحظة مستقلة داخل الدرس — نص طويل قابل للحفظ والفتح لاحقاً.
class LessonNote {
  LessonNote({
    required this.id,
    required this.title,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  String title;
  String content;
  final DateTime createdAt;
  DateTime updatedAt;

  factory LessonNote.fromJson(Map<String, dynamic> json) {
    return LessonNote(
      id: json['id']?.toString() ?? newId(),
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      createdAt: asDate(json['createdAt']),
      updatedAt: asDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  LessonNote copyWith({
    String? title,
    String? content,
    DateTime? updatedAt,
  }) {
    return LessonNote(
      id: id,
      title: title ?? this.title,
      content: content ?? this.content,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
