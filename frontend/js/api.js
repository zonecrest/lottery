/**
 * Ghana E-VAT Receipt Lottery - API Module
 * Handles communication with n8n backend and local demo mode
 */

const API = {
  /**
   * Submit a scanned QR code
   * @param {string} qrCode - The scanned QR code
   * @param {string} phone - User's phone number
   * @returns {Promise<Object>} Scan result
   */
  async submitScan(qrCode, phone) {
    const timestamp = new Date().toISOString();

    // Check if n8n is configured, otherwise use demo mode
    if (CONFIG.DEMO_MODE || !CONFIG.isN8nConfigured()) {
      return this._demoScan(qrCode, phone, timestamp);
    }

    try {
      const response = await fetch(CONFIG.getEndpoint(CONFIG.ENDPOINTS.SCAN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qr_code: qrCode,
          phone: phone,
          timestamp: timestamp
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      // Fallback to demo mode on error
      return this._demoScan(qrCode, phone, timestamp);
    }
  },

  /**
   * Get leaderboard data
   * @param {string} phone - Current user's phone for rank highlighting
   * @param {string} period - 'weekly' or 'all-time'
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(phone, period = 'all-time') {
    if (CONFIG.DEMO_MODE || !CONFIG.isN8nConfigured()) {
      return this._demoLeaderboard(phone, period);
    }

    try {
      const response = await fetch(
        `${CONFIG.getEndpoint(CONFIG.ENDPOINTS.LEADERBOARD)}?phone=${encodeURIComponent(phone)}&period=${period}`
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return this._demoLeaderboard(phone, period);
    }
  },

  /**
   * Get audit log data
   * @returns {Promise<Object>} Audit log entries
   */
  async getAuditLog() {
    if (CONFIG.DEMO_MODE || !CONFIG.isN8nConfigured()) {
      return this._demoAuditLog();
    }

    try {
      const response = await fetch(CONFIG.getEndpoint(CONFIG.ENDPOINTS.AUDIT_LOG));

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return this._demoAuditLog();
    }
  },

  /**
   * Generate demo QR codes
   * @param {number} count - Number of QR codes to generate
   * @returns {Promise<Object>} Generated QR codes
   */
  async generateQRCodes(count = 5) {
    // Always use local generation for QR codes
    return this._generateDemoQRCodes(count);
  },

  // ==================== Demo Mode Functions ====================

  /**
   * Demo mode scan simulation
   */
  _demoScan(qrCode, phone, timestamp) {
    // Validate QR code format
    if (!CONFIG.QR_PATTERN.test(qrCode)) {
      return {
        success: false,
        error: 'Invalid QR code format',
        message: 'This doesn\'t look like a valid GRA VAT receipt QR code.'
      };
    }

    // Check for duplicate scan
    const scanHistory = this._getScanHistory();
    if (scanHistory.includes(qrCode)) {
      return {
        success: false,
        error: 'Duplicate scan',
        message: 'This receipt has already been scanned!'
      };
    }

    // Check rate limiting
    const recentScans = this._getRecentScans(phone);
    if (recentScans >= CONFIG.MAX_SCANS_PER_HOUR) {
      return {
        success: false,
        error: 'Rate limited',
        message: `You've reached the limit of ${CONFIG.MAX_SCANS_PER_HOUR} scans per hour. Try again later!`
      };
    }

    // Generate random result
    const random = Math.random() * 100;
    const isWin = random < CONFIG.WIN_PERCENTAGE;

    let prize = null;
    if (isWin) {
      prize = this._determinePrize();
    }

    // Generate transaction hash
    const randomSeed = Math.random().toString(36).substring(2, 15);
    const transactionHash = this._generateHash(qrCode + phone + timestamp + randomSeed);

    // Store the scan
    this._storeScan({
      qrCode,
      phone,
      timestamp,
      result: isWin ? 'WIN' : 'LOSE',
      prize,
      transactionHash,
      randomSeed
    });

    // Get updated stats
    const stats = this._getUserStats(phone);

    return {
      success: true,
      result: isWin ? 'WIN' : 'LOSE',
      prize: prize,
      transaction_hash: transactionHash,
      message: isWin
        ? `Congratulations! You won ${prize}!`
        : 'No win this time - keep scanning for more chances!',
      total_scans: stats.totalScans,
      total_wins: stats.totalWins
    };
  },

  /**
   * Demo mode leaderboard
   */
  _demoLeaderboard(phone, period) {
    const leaderboard = this._getStoredLeaderboard();
    const userStats = this._getUserStats(phone);

    // Add some demo users if leaderboard is empty
    if (leaderboard.length < 5) {
      const demoUsers = [
        { phone: '0241234567', scans: 45, wins: 5 },
        { phone: '0551234567', scans: 38, wins: 3 },
        { phone: '0271234567', scans: 32, wins: 4 },
        { phone: '0201234567', scans: 28, wins: 2 },
        { phone: '0541234567', scans: 22, wins: 3 }
      ];

      demoUsers.forEach(user => {
        if (!leaderboard.find(u => u.phone === user.phone)) {
          leaderboard.push(user);
        }
      });
    }

    // Ensure current user is in leaderboard
    const existingUser = leaderboard.find(u => u.phone === phone);
    if (existingUser) {
      existingUser.scans = userStats.totalScans;
      existingUser.wins = userStats.totalWins;
    } else if (userStats.totalScans > 0) {
      leaderboard.push({
        phone: phone,
        scans: userStats.totalScans,
        wins: userStats.totalWins
      });
    }

    // Sort by scans
    leaderboard.sort((a, b) => b.scans - a.scans);

    // Calculate user rank
    const userRank = leaderboard.findIndex(u => u.phone === phone) + 1;

    // Format and return
    return {
      leaderboard: leaderboard.slice(0, 10).map((user, index) => ({
        rank: index + 1,
        phone_masked: this._maskPhone(user.phone),
        phone: user.phone,
        scans: user.scans,
        wins: user.wins,
        badge: this._getBadge(user.scans)
      })),
      user_rank: userRank || null,
      user_scans: userStats.totalScans,
      user_wins: userStats.totalWins
    };
  },

  /**
   * Demo mode audit log
   */
  _demoAuditLog() {
    const auditLog = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.AUDIT_LOG) || '[]');

    // Calculate totals
    const totalWinners = auditLog.length;
    const totalPayouts = auditLog.reduce((sum, entry) => {
      const amount = parseInt(entry.prize.replace(/[^0-9]/g, '')) || 0;
      return sum + amount;
    }, 0);

    return {
      entries: auditLog.map(entry => ({
        timestamp: entry.timestamp,
        phone_masked: this._maskPhone(entry.phone),
        prize: entry.prize,
        transaction_hash: entry.transactionHash,
        verification_data: {
          qr_hash: entry.qrCode ? this._generateHash(entry.qrCode).substring(0, 16) : '...',
          random_seed: entry.randomSeed || '...',
          combined_hash: entry.transactionHash
        }
      })),
      total_payouts: `GH₵${totalPayouts.toLocaleString()}`,
      total_winners: totalWinners
    };
  },

  /**
   * Generate demo QR codes
   */
  _generateDemoQRCodes(count) {
    const codes = [];
    const year = new Date().getFullYear();

    for (let i = 0; i < count; i++) {
      const code = `GRA-VAT-${year}-${this._randomCode()}-${this._randomCode()}-${this._randomCode()}`;
      codes.push({
        code: code,
        qr_data: code
      });
    }

    return { qr_codes: codes };
  },

  // ==================== Helper Functions ====================

  /**
   * Generate random 4-character code
   */
  _randomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Determine prize tier
   */
  _determinePrize() {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [prize, percentage] of Object.entries(CONFIG.PRIZES)) {
      cumulative += percentage;
      if (random < cumulative) {
        return prize;
      }
    }

    return Object.keys(CONFIG.PRIZES)[0];
  },

  /**
   * Generate SHA-256-like hash (simplified for demo)
   */
  _generateHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Convert to hex-like string
    const hex = Math.abs(hash).toString(16);
    const padding = '0'.repeat(64 - hex.length);
    return (padding + hex).substring(0, 64);
  },

  /**
   * Mask phone number for privacy
   */
  _maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 3);
  },

  /**
   * Get badge based on scan count
   */
  _getBadge(scans) {
    if (scans >= 50) return { name: 'Gold', emoji: '🥇' };
    if (scans >= 25) return { name: 'Silver', emoji: '🥈' };
    if (scans >= 10) return { name: 'Bronze', emoji: '🥉' };
    return null;
  },

  /**
   * Get scan history from local storage
   */
  _getScanHistory() {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SCAN_HISTORY) || '[]');
  },

  /**
   * Get recent scans count for rate limiting
   */
  _getRecentScans(phone) {
    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SCAN_HISTORY) || '[]');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return history.filter(scan =>
      scan.phone === phone &&
      new Date(scan.timestamp) > oneHourAgo
    ).length;
  },

  /**
   * Store a scan result
   */
  _storeScan(scan) {
    // Store in scan history
    const history = this._getScanHistory();
    history.push({
      qrCode: scan.qrCode,
      phone: scan.phone,
      timestamp: scan.timestamp,
      result: scan.result,
      prize: scan.prize
    });
    localStorage.setItem(CONFIG.STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));

    // Add QR code to scanned list
    const scannedCodes = JSON.parse(localStorage.getItem('scanned_codes') || '[]');
    scannedCodes.push(scan.qrCode);
    localStorage.setItem('scanned_codes', JSON.stringify(scannedCodes));

    // If win, add to audit log
    if (scan.result === 'WIN') {
      const auditLog = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.AUDIT_LOG) || '[]');
      auditLog.unshift({
        timestamp: scan.timestamp,
        phone: scan.phone,
        qrCode: scan.qrCode,
        prize: scan.prize,
        transactionHash: scan.transactionHash,
        randomSeed: scan.randomSeed
      });
      localStorage.setItem(CONFIG.STORAGE_KEYS.AUDIT_LOG, JSON.stringify(auditLog));
    }

    // Update leaderboard
    this._updateLeaderboard(scan.phone, scan.result === 'WIN');
  },

  /**
   * Get user stats
   */
  _getUserStats(phone) {
    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SCAN_HISTORY) || '[]');
    const userScans = history.filter(scan => scan.phone === phone);

    return {
      totalScans: userScans.length,
      totalWins: userScans.filter(scan => scan.result === 'WIN').length
    };
  },

  /**
   * Get stored leaderboard
   */
  _getStoredLeaderboard() {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEADERBOARD) || '[]');
  },

  /**
   * Update leaderboard
   */
  _updateLeaderboard(phone, isWin) {
    const leaderboard = this._getStoredLeaderboard();

    let user = leaderboard.find(u => u.phone === phone);
    if (!user) {
      user = { phone, scans: 0, wins: 0 };
      leaderboard.push(user);
    }

    user.scans++;
    if (isWin) user.wins++;

    localStorage.setItem(CONFIG.STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
  },

  /**
   * Clear all demo data
   */
  clearDemoData() {
    Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('scanned_codes');
  }
};
