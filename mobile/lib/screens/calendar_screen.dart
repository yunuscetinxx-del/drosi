import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/calendar_event.dart';
import '../models/json_utils.dart';
import '../providers/app_state.dart';
import '../widgets/empty_state.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadCalendar();
    });
  }

  List<CalendarEvent> _sorted(List<CalendarEvent> events) {
    final list = [...events];
    list.sort((a, b) => a.start.compareTo(b.start));
    return list;
  }

  Future<void> _addEvent() async {
    final now = DateTime.now();
    final result = await showDialog<_EventFormResult>(
      context: context,
      builder: (ctx) => _EventDialog(
        initial: CalendarEvent(
          id: newId(),
          title: '',
          description: '',
          start: now,
          end: now.add(const Duration(hours: 1)),
          allDay: false,
          color: '#039be5',
          createdAt: now,
          updatedAt: now,
        ),
      ),
    );
    if (result == null) return;
    await context.read<AppState>().addCalendarEvent(result.event);
  }

  Future<void> _editEvent(CalendarEvent event) async {
    final result = await showDialog<_EventFormResult>(
      context: context,
      builder: (ctx) => _EventDialog(initial: event),
    );
    if (result == null) return;
    if (result.delete) {
      await context.read<AppState>().deleteCalendarEvent(event.id);
    } else {
      await context.read<AppState>().updateCalendarEvent(result.event);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final events = _sorted(state.calendarEvents);
    final upcoming = events.where((e) => e.end.isAfter(DateTime.now())).toList();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: state.calendarLoading
            ? const Center(child: CircularProgressIndicator())
            : upcoming.isEmpty
                ? const EmptyState(
                    icon: Icons.calendar_month_outlined,
                    title: 'لا أحداث في التقويم',
                    message: 'أضف مواعيد دراسة أو امتحانات — تُزامن مع الموقع.',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                    itemCount: upcoming.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final e = upcoming[i];
                      return _EventCard(event: e, onTap: () => _editEvent(e));
                    },
                  ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: state.online ? _addEvent : null,
        icon: const Icon(Icons.add),
        label: const Text('حدث جديد'),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event, required this.onTap});
  final CalendarEvent event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(event.color);
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 4,
                height: 48,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(event.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(_formatRange(event), style: Theme.of(context).textTheme.bodySmall),
                    if (event.description.isNotEmpty)
                      Text(
                        event.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _parseColor(String hex) {
    var v = hex.replaceFirst('#', '');
    if (v.length == 6) v = 'FF$v';
    return Color(int.tryParse(v, radix: 16) ?? 0xFF039BE5);
  }

  String _formatRange(CalendarEvent e) {
    if (e.allDay) {
      return '${e.start.day}/${e.start.month}/${e.start.year} — طوال اليوم';
    }
    final sh = e.start.hour.toString().padLeft(2, '0');
    final sm = e.start.minute.toString().padLeft(2, '0');
    final eh = e.end.hour.toString().padLeft(2, '0');
    final em = e.end.minute.toString().padLeft(2, '0');
    return '${e.start.day}/${e.start.month} $sh:$sm — $eh:$em';
  }
}

class _EventFormResult {
  _EventFormResult({required this.event, this.delete = false});
  final CalendarEvent event;
  final bool delete;
}

class _EventDialog extends StatefulWidget {
  const _EventDialog({required this.initial});
  final CalendarEvent initial;

  @override
  State<_EventDialog> createState() => _EventDialogState();
}

class _EventDialogState extends State<_EventDialog> {
  late final TextEditingController _title;
  late final TextEditingController _desc;
  late DateTime _start;
  late DateTime _end;
  late bool _allDay;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.initial.title);
    _desc = TextEditingController(text: widget.initial.description);
    _start = widget.initial.start;
    _end = widget.initial.end;
    _allDay = widget.initial.allDay;
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pickStart() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _start,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (date == null) return;
    if (_allDay) {
      setState(() {
        _start = DateTime(date.year, date.month, date.day);
        _end = _start.add(const Duration(days: 1)).subtract(const Duration(seconds: 1));
      });
      return;
    }
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_start));
    if (time == null) return;
    setState(() {
      _start = DateTime(date.year, date.month, date.day, time.hour, time.minute);
      if (!_end.isAfter(_start)) _end = _start.add(const Duration(hours: 1));
    });
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.initial.title.isNotEmpty;
    return AlertDialog(
      title: Text(isEdit ? 'تعديل الحدث' : 'حدث جديد'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'العنوان', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _desc,
              decoration: const InputDecoration(labelText: 'الوصف', border: OutlineInputBorder()),
              maxLines: 2,
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('طوال اليوم'),
              value: _allDay,
              onChanged: (v) => setState(() => _allDay = v),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('البداية'),
              subtitle: Text('${_start.day}/${_start.month}/${_start.year}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: _pickStart,
            ),
          ],
        ),
      ),
      actions: [
        if (isEdit)
          TextButton(
            onPressed: () => Navigator.pop(
              context,
              _EventFormResult(event: widget.initial, delete: true),
            ),
            child: const Text('حذف', style: TextStyle(color: Colors.red)),
          ),
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
        FilledButton(
          onPressed: () {
            final now = DateTime.now();
            Navigator.pop(
              context,
              _EventFormResult(
                event: CalendarEvent(
                  id: widget.initial.id,
                  title: _title.text.trim(),
                  description: _desc.text.trim(),
                  start: _start,
                  end: _end,
                  allDay: _allDay,
                  color: widget.initial.color,
                  lessonId: widget.initial.lessonId,
                  createdAt: widget.initial.createdAt,
                  updatedAt: now,
                ),
              ),
            );
          },
          child: const Text('حفظ'),
        ),
      ],
    );
  }
}
