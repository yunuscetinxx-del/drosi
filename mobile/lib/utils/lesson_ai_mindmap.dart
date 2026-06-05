import 'dart:math' as math;

import '../models/chat_source_scope.dart';
import '../models/json_utils.dart';
import '../models/lesson.dart';
import '../models/lesson_analysis.dart';
import '../models/mind_map.dart';

const _centerX = 700.0;
const _centerY = 400.0;
const _branchRadius = 200.0;

List<String> collectMindMapBranchesFromSources(
  Lesson lesson,
  ChatSourceScope scope,
  List<LessonAnalysisEntry> analyses,
) {
  final branches = <String>{};

  for (final id in scope.analysisIds) {
    for (final a in analyses) {
      if (a.id != id) continue;
      final c = a.content;
      for (final k in (c['keyElements'] as List<dynamic>? ?? [])) {
        final t = k.toString().trim();
        if (t.isNotEmpty) branches.add(t);
      }
      for (final g in (c['grammarTopics'] as List<dynamic>? ?? [])) {
        final t = g.toString().trim();
        if (t.isNotEmpty) branches.add(t);
      }
      for (final r in (c['relatedConcepts'] as List<dynamic>? ?? [])) {
        final t = r.toString().trim();
        if (t.isNotEmpty) branches.add(t);
      }
      for (final n in (c['studyNotes'] as List<dynamic>? ?? [])) {
        final t = n.toString().trim();
        if (t.isNotEmpty) branches.add(t.length > 80 ? t.substring(0, 80) : t);
      }
      for (final ex in (c['exercises'] as List<dynamic>? ?? [])) {
        if (ex is! Map) continue;
        final title = ex['title']?.toString().trim() ?? '';
        if (title.isNotEmpty) {
          branches.add('تمرين ${ex['number']}: $title');
        }
      }
      for (final v in (c['vocabulary'] as List<dynamic>? ?? [])) {
        if (v is! Map) continue;
        final term = v['term']?.toString().trim() ?? '';
        if (term.isNotEmpty) {
          branches.add('$term: ${v['meaning'] ?? ''}');
        }
      }
      break;
    }
  }

  for (final id in scope.imageIds) {
    for (final img in lesson.images) {
      if (img.id != id) continue;
      final ai = img.aiAnalysis;
      if (ai != null) {
        branches.addAll(ai.keyElements);
        branches.addAll(ai.relatedConcepts);
      }
      break;
    }
  }

  for (final id in scope.noteIds) {
    for (final n in lesson.lessonNotes) {
      if (n.id == id && n.title.trim().isNotEmpty) {
        branches.add(n.title.trim());
        break;
      }
    }
  }

  for (final id in scope.wordPageIds) {
    for (final p in lesson.wordPages) {
      if (p.id == id && p.title.trim().isNotEmpty) {
        branches.add(p.title.trim());
        break;
      }
    }
  }

  return branches.take(24).toList();
}

List<MindMapNode> buildMindMapNodesFromSources(
  String lessonTitle,
  Lesson lesson,
  ChatSourceScope scope,
  List<LessonAnalysisEntry> analyses,
) {
  final branches = collectMindMapBranchesFromSources(lesson, scope, analyses);
  String center = lessonTitle;
  for (final a in analyses) {
    if (scope.analysisIds.contains(a.id)) {
      center = a.title;
      break;
    }
  }
  return buildMindMapNodesFromTexts(center, branches);
}

List<MindMapNode> buildMindMapNodesFromTexts(String centerText, List<String> branches) {
  final trimmed = branches.map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
  if (centerText.trim().isEmpty && trimmed.isEmpty) return [];

  final centerId = newId();
  final nodes = <MindMapNode>[
    MindMapNode(
      id: centerId,
      text: centerText.trim().isEmpty ? '—' : centerText.trim(),
      x: _centerX - 84,
      y: _centerY - 26,
      parentId: null,
      color: hexFromColor(kMindMapNodeColors[0]),
      role: MindMapNodeRole.main,
    ),
  ];

  for (var i = 0; i < trimmed.length; i++) {
    final angle = (i / math.max(trimmed.length, 1)) * math.pi * 2 - math.pi / 2;
    final x = _centerX + math.cos(angle) * _branchRadius;
    final y = _centerY + math.sin(angle) * (_branchRadius * 0.65);
    nodes.add(
      MindMapNode(
        id: newId(),
        text: trimmed[i],
        x: x - 62,
        y: y - 19,
        parentId: centerId,
        color: hexFromColor(kMindMapNodeColors[(i + 1) % kMindMapNodeColors.length]),
        role: MindMapNodeRole.branch,
      ),
    );
  }
  return nodes;
}
