import 'json_utils.dart';

class ImageAnnotation {
  ImageAnnotation({
    required this.id,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.color,
    required this.note,
    required this.createdAt,
  });

  final String id;
  double x;
  double y;
  double width;
  double height;
  String color;
  String note;
  final DateTime createdAt;

  factory ImageAnnotation.fromJson(Map<String, dynamic> json) {
    return ImageAnnotation(
      id: json['id']?.toString() ?? newId(),
      x: asDouble(json['x']),
      y: asDouble(json['y']),
      width: asDouble(json['width']),
      height: asDouble(json['height']),
      color: json['color']?.toString() ?? '#f59e0b',
      note: json['note']?.toString() ?? '',
      createdAt: asDate(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'x': x,
        'y': y,
        'width': width,
        'height': height,
        'color': color,
        'note': note,
        'createdAt': createdAt.toIso8601String(),
      };
}

class ImageAIAnalysis {
  ImageAIAnalysis({
    required this.description,
    required this.keyElements,
    required this.studyNotes,
    required this.relatedConcepts,
    required this.analyzedAt,
  });

  final String description;
  final List<String> keyElements;
  final List<String> studyNotes;
  final List<String> relatedConcepts;
  final DateTime analyzedAt;

  factory ImageAIAnalysis.fromJson(Map<String, dynamic> json) {
    return ImageAIAnalysis(
      description: json['description']?.toString() ?? '',
      keyElements: asStringList(json['keyElements']),
      studyNotes: asStringList(json['studyNotes']),
      relatedConcepts: asStringList(json['relatedConcepts']),
      analyzedAt: asDate(json['analyzedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'description': description,
        'keyElements': keyElements,
        'studyNotes': studyNotes,
        'relatedConcepts': relatedConcepts,
        'analyzedAt': analyzedAt.toIso8601String(),
      };
}

class LessonImage {
  LessonImage({
    required this.id,
    required this.url,
    required this.annotations,
    this.aiAnalysis,
  });

  final String id;
  final String url;
  List<ImageAnnotation> annotations;
  ImageAIAnalysis? aiAnalysis;

  factory LessonImage.fromJson(Map<String, dynamic> json) {
    return LessonImage(
      id: json['id']?.toString() ?? newId(),
      url: json['url']?.toString() ?? '',
      annotations: (json['annotations'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ImageAnnotation.fromJson)
          .toList(),
      aiAnalysis: json['aiAnalysis'] is Map<String, dynamic>
          ? ImageAIAnalysis.fromJson(json['aiAnalysis'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'url': url,
        'annotations': annotations.map((a) => a.toJson()).toList(),
        if (aiAnalysis != null) 'aiAnalysis': aiAnalysis!.toJson(),
      };
}
