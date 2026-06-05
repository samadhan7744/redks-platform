import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class RedKsAppBar extends StatelessWidget implements PreferredSizeWidget {
  const RedKsAppBar({super.key, required this.title, this.actions});

  final String title;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return AppBar(
      surfaceTintColor: Colors.white,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppTheme.dark,
              fontWeight: FontWeight.w900,
            ),
          ),
          const Text(
            'Har Dukaan, Ghar Tak.',
            style: TextStyle(fontSize: 11, color: AppTheme.muted),
          ),
        ],
      ),
      actions: actions,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
