/**
 * Ghana E-VAT Receipt Lottery - Configuration
 */

const CONFIG = {
  // n8n webhook base URL (user will replace this with their own)
  N8N_WEBHOOK_URL: 'https://zonecrest.app.n8n.cloud/webhook/scan',

  // Demo mode - uses local simulation when n8n is not configured
  DEMO_MODE: true,

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

  // QR code format validation
  QR_PATTERN: /^GRA-VAT-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,

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
