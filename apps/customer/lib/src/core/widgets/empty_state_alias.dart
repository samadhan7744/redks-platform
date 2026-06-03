import 'package:flutter/material.dart';

class EmptyStateAlias extends StatelessWidget {
  const EmptyStateAlias(this.message, {super.key});
  final String message;

  @override
  Widget build(BuildContext context) =>
      Center(child: Text(message, textAlign: TextAlign.center));
}
