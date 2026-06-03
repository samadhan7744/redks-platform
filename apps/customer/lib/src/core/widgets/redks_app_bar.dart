import 'package:flutter/material.dart';

class RedKsAppBar extends StatelessWidget implements PreferredSizeWidget {
  const RedKsAppBar({super.key, required this.title, this.actions});

  final String title;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const Text('Har Dukaan, Ghar Tak.', style: TextStyle(fontSize: 11)),
        ],
      ),
      actions: actions,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
