import 'json_utils.dart';

class LessonAnalysisEntry {
  LessonAnalysisEntry({
    required this.id,
    required this.type,
    required this.title,
    required this.subject,
    required this.summary,
    required this.markdownReport,
    required this.chatThreadId,
    required this.createdAt,
    required this.updatedAt,
    this.imageId,
    this.imageUrl,
    this.level,
    this.mode = 'auto',
    this.content = const {},
  });

  final String id;
  final String type;
  final String? imageId;
  final String? imageUrl;
  final String title;
  final String subject;
  final String? level;
  final String mode;
  final String summary;
  final Map<String, dynamic> content;
  final String markdownReport;
  final String chatThreadId;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory LessonAnalysisEntry.fromJson(Map<String, dynamic> json) {
    return LessonAnalysisEntry(
      id: json['id']?.toString() ?? newId(),
      type: json['type']?.toString() ?? 'school_page',
      imageId: json['imageId']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      title: json['title']?.toString() ?? '',
      subject: json['subject']?.toString() ?? '',
      level: json['level']?.toString(),
      mode: json['mode']?.toString() ?? 'auto',
      summary: json['summary']?.toString() ?? '',
      content: json['content'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['content'] as Map)
          : {},
      markdownReport: json['markdownReport']?.toString() ?? '',
      chatThreadId: json['chatThreadId']?.toString() ?? newId(),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        if (imageId != null) 'imageId': imageId,
        if (imageUrl != null) 'imageUrl': imageUrl,
        'title': title,
        'subject': subject,
        if (level != null) 'level': level,
        'mode': mode,
        'summary': summary,
        'content': content,
        'markdownReport': markdownReport,
        'chatThreadId': chatThreadId,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}

class LessonChatMessage {
  LessonChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String role;
  final String content;
  final DateTime createdAt;

  factory LessonChatMessage.fromJson(Map<String, dynamic> json) {
    return LessonChatMessage(
      id: json['id']?.toString() ?? newId(),
      role: json['role']?.toString() ?? 'user',
      content: json['content']?.toString() ?? '',
      createdAt: asDate(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role,
        'content': content,
        'createdAt': createdAt.toIso8601String(),
      };
}

class LessonChatThread {
  LessonChatThread({
    required this.id,
    required this.title,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
    this.analysisId,
  });

  final String id;
  final String? analysisId;
  final String title;
  final List<LessonChatMessage> messages;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory LessonChatThread.fromJson(Map<String, dynamic> json) {
    return LessonChatThread(
      id: json['id']?.toString() ?? newId(),
      analysisId: json['analysisId']?.toString(),
      title: json['title']?.toString() ?? '',
      messages: (json['messages'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(LessonChatMessage.fromJson)
          .toList(),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (analysisId != null) 'analysisId': analysisId,
        'title': title,
        'messages': messages.map((m) => m.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}
