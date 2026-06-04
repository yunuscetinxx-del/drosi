import 'json_utils.dart';

class WordPage {
  WordPage({
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

  factory WordPage.fromJson(Map<String, dynamic> json) {
    return WordPage(
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
}
