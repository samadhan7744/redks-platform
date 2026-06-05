class AppConfig {
  static const defaultBaseUrl = 'http://10.0.2.2:3000/api/v1';

  static String get apiBaseUrl {
    const value = String.fromEnvironment('REDKS_API_BASE_URL');
    return value.isNotEmpty ? value : defaultBaseUrl;
  }
}
