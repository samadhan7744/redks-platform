import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:redks_partner/src/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows RedKS partner login', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const ProviderScope(child: RedKsPartnerApp()));
    await tester.pumpAndSettle();

    expect(find.text('RedKS'), findsOneWidget);
    expect(find.text('Har Dukaan, Ghar Tak.'), findsOneWidget);
    expect(find.text('Request OTP'), findsOneWidget);
  });
}
