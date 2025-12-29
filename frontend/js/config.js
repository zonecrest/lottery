/**
 * Ghana E-VAT Receipt Lottery - Configuration
 */

const CONFIG = {
  // n8n webhook base URL (user will replace this with their own)
  N8N_WEBHOOK_URL: 'https://zonecrest.app.n8n.cloud/webhook',

  // Demo mode - uses local simulation when n8n is not configured
  DEMO_MODE: false,

  // Demo settings
  WIN_PERCENTAGE: 10,  // 10% chance to win

  // Prize tiers (percentages of wins, must sum to 100)
  PRIZES: {
    'GH₵5 Airtime': 70,
    'GH₵10 Airtime': 25,
    'GH₵50 Airtime': 5
  },

  // Rate limiting
  MAX_SCANS_PER_HOUR: 10,

  // QR Code format version: 'v1' or 'v2'
  // v1 = simple text format (GRA-VAT-2024-XXXX-XXXX-XXXX)
  // v2 = realistic URL format matching real GRA e-VAT receipts
  // NOTE: This is SEPARATE from DEMO_MODE which controls n8n connectivity
  QR_FORMAT_VERSION: 'v2',

  // QR code format validation patterns
  QR_PATTERNS: {
    v1: /^GRA-VAT-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    v2: /^https?:\/\/(evat\.gra\.gov\.gh|vsdc\.vat-gh\.com)\/verify\?/i
  },

  // Legacy pattern (for backwards compatibility)
  QR_PATTERN: /^GRA-VAT-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,

  // v2 QR generation settings (realistic format)
  QR_V2_SETTINGS: {
    BASE_URL: 'https://evat.gra.gov.gh/verify',
    SDC_ID_MIN: 10000000,
    SDC_ID_MAX: 99999999
  },

  // Local storage keys
  STORAGE_KEYS: {
    PHONE: 'evat_phone',
    SCANS: 'evat_scans',
    WINS: 'evat_wins',
    SCAN_HISTORY: 'evat_scan_history',
    LEADERBOARD: 'evat_leaderboard',
    AUDIT_LOG: 'evat_audit_log'
  },

  // API endpoints (relative to N8N_WEBHOOK_URL)
  ENDPOINTS: {
    SCAN: '/scan',
    LEADERBOARD: '/leaderboard',
    AUDIT_LOG: '/audit-log',
    GENERATE_QR: '/generate-qr'
  },

  // Check if n8n is configured
  isN8nConfigured() {
    return !this.N8N_WEBHOOK_URL.includes('YOUR-N8N-INSTANCE');
  },

  // Get full endpoint URL
  getEndpoint(endpoint) {
    return this.N8N_WEBHOOK_URL + endpoint;
  }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.PRIZES);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.ENDPOINTS);
