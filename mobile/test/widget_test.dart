import 'package:flutter_test/flutter_test.dart';

import 'package:drosi_mobile/main.dart';

void main() {
  testWidgets('App loads', (WidgetTester tester) async {
    await tester.pumpWidget(const DrosiApp());
    expect(find.text('دروسي'), findsOneWidget);
  });
}
