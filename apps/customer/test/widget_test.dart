import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:redks_customer/src/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('RedKS customer app renders splash while restoring auth', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const ProviderScope(child: RedKsCustomerApp()));

    expect(find.text('RedKS'), findsOneWidget);
    expect(find.text('Har Dukaan, Ghar Tak.'), findsOneWidget);
  });
}
