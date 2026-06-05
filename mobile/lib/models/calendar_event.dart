import 'json_utils.dart';

class CalendarEvent {
  CalendarEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.start,
    required this.end,
    required this.allDay,
    required this.color,
    this.lessonId,
    this.externalUid,
    this.source,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  String title;
  String description;
  DateTime start;
  DateTime end;
  bool allDay;
  String color;
  String? lessonId;
  String? externalUid;
  String? source;
  final DateTime createdAt;
  DateTime updatedAt;

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id']?.toString() ?? newId(),
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      start: asDate(json['start']),
      end: asDate(json['end']),
      allDay: json['allDay'] == true,
      color: json['color']?.toString() ?? '#039be5',
      lessonId: json['lessonId']?.toString(),
      externalUid: json['externalUid']?.toString(),
      source: json['source']?.toString(),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'start': start.toIso8601String(),
        'end': end.toIso8601String(),
        'allDay': allDay,
        'color': color,
        if (lessonId != null) 'lessonId': lessonId,
        if (externalUid != null) 'externalUid': externalUid,
        if (source != null) 'source': source,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}
