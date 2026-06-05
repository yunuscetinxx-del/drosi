class ChatSourceScope {
  const ChatSourceScope({
    this.analysisIds = const [],
    this.imageIds = const [],
    this.noteIds = const [],
    this.wordPageIds = const [],
  });

  final List<String> analysisIds;
  final List<String> imageIds;
  final List<String> noteIds;
  final List<String> wordPageIds;

  static const empty = ChatSourceScope();

  int get count =>
      analysisIds.length +
      imageIds.length +
      noteIds.length +
      wordPageIds.length;

  ChatSourceScope copyWith({
    List<String>? analysisIds,
    List<String>? imageIds,
    List<String>? noteIds,
    List<String>? wordPageIds,
  }) {
    return ChatSourceScope(
      analysisIds: analysisIds ?? this.analysisIds,
      imageIds: imageIds ?? this.imageIds,
      noteIds: noteIds ?? this.noteIds,
      wordPageIds: wordPageIds ?? this.wordPageIds,
    );
  }

  factory ChatSourceScope.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) return ChatSourceScope.empty;
    List<String> ids(String key) =>
        (json[key] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
    return ChatSourceScope(
      analysisIds: ids('analysisIds'),
      imageIds: ids('imageIds'),
      noteIds: ids('noteIds'),
      wordPageIds: ids('wordPageIds'),
    );
  }

  Map<String, dynamic> toJson() => {
        'analysisIds': analysisIds,
        'imageIds': imageIds,
        'noteIds': noteIds,
        'wordPageIds': wordPageIds,
      };
}
