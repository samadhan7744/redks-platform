import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:redks_rider/src/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows RedKS rider login', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const ProviderScope(child: RedKsRiderApp()));
    await tester.pumpAndSettle();

    expect(find.text('RedKS Rider'), findsOneWidget);
    expect(find.text('Delivery Partner Network'), findsOneWidget);
    expect(find.text('Request OTP'), findsOneWidget);
  });
}
