import 'package:dio/dio.dart';

import '../models/calendar_event.dart';
import 'api_client.dart';

class CalendarService {
  final _api = ApiClient.instance;

  Future<List<CalendarEvent>> fetchEvents() async {
    try {
      final res = await _api.dio.get('/api/calendar');
      final data = res.data as Map<String, dynamic>;
      final list = data['events'] as List<dynamic>? ?? [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(CalendarEvent.fromJson)
          .toList();
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Future<void> saveEvents(List<CalendarEvent> events) async {
    try {
      await _api.dio.put(
        '/api/calendar',
        data: {'events': events.map((e) => e.toJson()).toList()},
      );
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }
}
