/**
 * Ghana E-VAT Receipt Lottery - Main Application
 */

const App = {
  // State
  userPhone: null,
  isRegistered: false,
  totalScans: 0,
  totalWins: 0,
  lastScannedCode: null,
  lastScanTime: 0,

  /**
   * Initialize the application
   */
  init() {
    // Check if user is registered
    this.userPhone = localStorage.getItem(CONFIG.STORAGE_KEYS.PHONE);
    this.isRegistered = !!this.userPhone;

    // Load user stats
    if (this.isRegistered) {
      this._loadUserStats();
    }

    // Initialize offline detection
    this._initOfflineDetection();

    // Initialize version badge
    this._updateVersionBadge();

    // Initialize page-specific features
    this._initPage();

    console.log('App initialized', {
      isRegistered: this.isRegistered,
      phone: this.userPhone,
      qrVersion: this.getQRFormatVersion()
    });
  },

  /**
   * Get current QR format version
   * @returns {string} 'v1' or 'v2'
   */
  getQRFormatVersion() {
    // Priority: URL param > localStorage > config default
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('qr')) {
      return urlParams.get('qr');
    }
    return localStorage.getItem('evat_qr_format_version') || CONFIG.QR_FORMAT_VERSION;
  },

  /**
   * Set QR format version
   * @param {string} version - 'v1' or 'v2'
   */
  setQRFormatVersion(version) {
    localStorage.setItem('evat_qr_format_version', version);
    this._updateVersionBadge();
  },

  /**
   * Update version badge display
   */
  _updateVersionBadge() {
    const badge = document.getElementById('qr-version-badge');
    if (!badge) return;

    const version = this.getQRFormatVersion();
    badge.className = `version-badge ${version}`;
    const badgeText = badge.querySelector('.badge-text');
    if (badgeText) {
      badgeText.textContent = `QR ${version}`;
    }
  },

  /**
   * Register user with phone number
   * @param {string} phone - Phone number
   */
  register(phone) {
    // Validate phone number (Ghana format)
    const phoneRegex = /^0[235][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      this.showToast('Please enter a valid Ghana phone number', 'error');
      return false;
    }

    this.userPhone = phone;
    this.isRegistered = true;
    localStorage.setItem(CONFIG.STORAGE_KEYS.PHONE, phone);

    this.showToast('Welcome to E-VAT Lottery!', 'success');
    return true;
  },

  /**
   * Handle QR code scan
   * @param {string} qrCode - Scanned QR code
   */
  async handleScan(qrCode) {
    if (!this.isRegistered) {
      this.showToast('Please register first', 'error');
      return;
    }

    // Parse the QR code to determine format and extract data
    const parsed = QRParser.parse(qrCode);
    console.log('[App] Parsed QR code:', parsed);

    // Check if it's a valid format
    if (!parsed.valid) {
      this.showToast('Invalid receipt QR code. Please scan a valid GRA VAT receipt.', 'error');
      if (Scanner.isScanning) {
        Scanner.resume();
      }
      return;
    }

    // Get unique ID for duplicate detection
    const uniqueId = QRParser.getUniqueId(parsed);

    // Debounce: ignore same code within 5 seconds
    const now = Date.now();
    if (uniqueId === this.lastScannedCode && (now - this.lastScanTime) < 5000) {
      console.log('[App] Ignoring duplicate scan');
      return;
    }
    this.lastScannedCode = uniqueId;
    this.lastScanTime = now;

    // Show loading
    this._showLoading(true);

    try {
      // Submit with parsed data
      const result = await API.submitScan(qrCode, this.userPhone, parsed);

      this._showLoading(false);

      if (result.success) {
        this.totalScans = result.total_scans;
        this.totalWins = result.total_wins;
        this._updateStatsDisplay();

        if (result.result === 'WIN') {
          this._showWinModal(result);
        } else {
          this._showLoseModal(result);
        }
      } else {
        this.showToast(result.message || 'Scan failed', 'error');
        // Resume scanner after error
        if (Scanner.isScanning) {
          Scanner.resume();
        }
      }
    } catch (error) {
      this._showLoading(false);
      console.error('Scan error:', error);
      this.showToast('Something went wrong. Please try again.', 'error');

      if (Scanner.isScanning) {
        Scanner.resume();
      }
    }
  },

  /**
   * Show win modal with celebration
   * @param {Object} result - Scan result
   */
  _showWinModal(result) {
    const modal = document.getElementById('result-modal');
    const modalContent = modal.querySelector('.modal');

    modalContent.className = 'modal modal-win';
    modalContent.innerHTML = `
      <div class="modal-icon">🎉</div>
      <h2>WINNER!</h2>
      <p class="prize">${result.prize}</p>
      <p>Your prize has been logged!</p>
      <div class="modal-hash">
        TX: ${result.transaction_hash}
      </div>
      <button class="btn btn-primary btn-block mt-2" onclick="App.closeModal()">
        Scan Another Receipt
      </button>
    `;

    modal.classList.add('active');

    // Trigger confetti
    this._triggerConfetti();

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }

    // Play win sound if available
    this._playWinSound();
  },

  /**
   * Show lose modal
   * @param {Object} result - Scan result
   */
  _showLoseModal(result) {
    const modal = document.getElementById('result-modal');
    const modalContent = modal.querySelector('.modal');

    modalContent.className = 'modal modal-lose';
    modalContent.innerHTML = `
      <div class="modal-icon">📝</div>
      <h2>Receipt Logged!</h2>
      <p>No win this time, but keep scanning for more chances!</p>
      <p class="text-sm text-gray mt-1">
        You've scanned ${result.total_scans} receipt${result.total_scans !== 1 ? 's' : ''}
        and won ${result.total_wins} time${result.total_wins !== 1 ? 's' : ''}!
      </p>
      <div class="modal-hash">
        TX: ${result.transaction_hash}
      </div>
      <button class="btn btn-primary btn-block mt-2" onclick="App.closeModal()">
        Scan Another Receipt
      </button>
    `;

    modal.classList.add('active');
  },

  /**
   * Close result modal
   */
  closeModal() {
    const modal = document.getElementById('result-modal');
    modal.classList.remove('active');

    // Resume scanner
    if (Scanner.isScanning) {
      setTimeout(() => Scanner.resume(), 300);
    }
  },

  /**
   * Trigger confetti celebration
   */
  _triggerConfetti() {
    if (typeof confetti === 'function') {
      // First burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FCD116', '#006B3F', '#CE1126']
      });

      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FCD116', '#006B3F']
        });
      }, 200);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FCD116', '#CE1126']
        });
      }, 400);
    }
  },

  /**
   * Play win sound
   */
  _playWinSound() {
    try {
      const audio = document.getElementById('win-sound');
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
      }
    } catch (e) {
      // Ignore audio errors
    }
  },

  /**
   * Show toast message
   * @param {string} message - Message to show
   * @param {string} type - 'success' or 'error'
   */
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  /**
   * Show/hide loading indicator
   * @param {boolean} show
   */
  _showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.classList.toggle('hidden', !show);
    }
  },

  /**
   * Load user stats from API
   */
  async _loadUserStats() {
    try {
      const leaderboard = await API.getLeaderboard(this.userPhone);
      this.totalScans = leaderboard.user_scans || 0;
      this.totalWins = leaderboard.user_wins || 0;
      this._updateStatsDisplay();
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  },

  /**
   * Update stats display on page
   */
  _updateStatsDisplay() {
    const scansEl = document.getElementById('total-scans');
    const winsEl = document.getElementById('total-wins');

    if (scansEl) scansEl.textContent = this.totalScans;
    if (winsEl) winsEl.textContent = this.totalWins;
  },

  /**
   * Initialize offline detection
   */
  _initOfflineDetection() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;

    const updateOnlineStatus = () => {
      banner.classList.toggle('show', !navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  },

  /**
   * Initialize page-specific features
   */
  _initPage() {
    const page = document.body.dataset.page;

    switch (page) {
      case 'scanner':
        this._initScannerPage();
        break;
      case 'leaderboard':
        this._initLeaderboardPage();
        break;
      case 'transparency':
        this._initTransparencyPage();
        break;
      case 'admin':
        this._initAdminPage();
        break;
    }
  },

  /**
   * Initialize scanner page
   */
  async _initScannerPage() {
    const registrationForm = document.getElementById('registration-form');
    const scannerSection = document.getElementById('scanner-section');
    const phoneInput = document.getElementById('phone-input');

    // Show appropriate section
    if (this.isRegistered) {
      if (registrationForm) registrationForm.classList.add('hidden');
      if (scannerSection) scannerSection.classList.remove('hidden');

      // Initialize scanner
      if (Scanner.init('qr-reader', (qrCode) => this.handleScan(qrCode))) {
        const started = await Scanner.start();
        if (!started) {
          this.showToast('Could not access camera. Please allow camera permissions.', 'error');
        }
      }
    } else {
      if (registrationForm) registrationForm.classList.remove('hidden');
      if (scannerSection) scannerSection.classList.add('hidden');
    }

    // Handle registration form
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        const phone = phoneInput?.value?.trim();
        if (phone && this.register(phone)) {
          registrationForm.classList.add('hidden');
          scannerSection.classList.remove('hidden');

          // Start scanner
          Scanner.init('qr-reader', (qrCode) => this.handleScan(qrCode));
          Scanner.start();
        }
      });
    }

    // Handle Enter key on phone input
    if (phoneInput) {
      phoneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          registerBtn?.click();
        }
      });
    }
  },

  /**
   * Initialize leaderboard page
   */
  async _initLeaderboardPage() {
    await this.loadLeaderboard();

    // Tab switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.loadLeaderboard(tab.dataset.period);
      });
    });
  },

  /**
   * Load and display leaderboard
   * @param {string} period - 'weekly' or 'all-time'
   */
  async loadLeaderboard(period = 'all-time') {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const data = await API.getLeaderboard(this.userPhone, period);

      let html = '';
      data.leaderboard.forEach(entry => {
        const isCurrentUser = entry.phone === this.userPhone;
        const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';

        html += `
          <li class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
            <div class="rank ${rankClass}">${entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}</div>
            <div class="leaderboard-info">
              <div class="leaderboard-phone">${entry.phone_masked} ${isCurrentUser ? '(You)' : ''}</div>
              <div class="leaderboard-stats">${entry.scans} scans • ${entry.wins} wins</div>
            </div>
            ${entry.badge ? `<div class="leaderboard-badge" title="${entry.badge.name} Scanner">${entry.badge.emoji}</div>` : ''}
          </li>
        `;
      });

      container.innerHTML = html || '<p class="text-center text-gray">No entries yet. Start scanning!</p>';

      // Update user rank display
      const rankDisplay = document.getElementById('user-rank');
      if (rankDisplay && data.user_rank) {
        rankDisplay.textContent = `Your rank: #${data.user_rank}`;
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      container.innerHTML = '<p class="text-center text-gray">Failed to load leaderboard</p>';
    }
  },

  /**
   * Initialize transparency page
   */
  async _initTransparencyPage() {
    await this.loadAuditLog();
  },

  /**
   * Load and display audit log
   */
  async loadAuditLog() {
    const container = document.getElementById('audit-list');
    const summaryContainer = document.getElementById('audit-summary');

    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const data = await API.getAuditLog();

      // Update summary
      if (summaryContainer) {
        summaryContainer.innerHTML = `
          <div class="summary-card">
            <div class="summary-value">${data.total_winners}</div>
            <div class="summary-label">Total Winners</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.total_payouts}</div>
            <div class="summary-label">Total Payouts</div>
          </div>
        `;
      }

      // Display entries
      if (data.entries.length === 0) {
        container.innerHTML = '<p class="text-center text-gray">No winning transactions yet.</p>';
        return;
      }

      let html = '';
      data.entries.forEach((entry, index) => {
        const time = new Date(entry.timestamp).toLocaleString('en-GH', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });

        html += `
          <li class="audit-item">
            <div class="audit-header">
              <div>
                <div class="audit-phone">${entry.phone_masked}</div>
                <div class="audit-time">${time}</div>
              </div>
              <div class="audit-prize">${entry.prize}</div>
            </div>
            <div class="audit-hash">${entry.transaction_hash}</div>
            <button class="btn btn-outline verify-btn" onclick="App.toggleVerification(${index})">
              Verify Hash
            </button>
            <div id="verification-${index}" class="verification-details">
              <div class="verification-row">
                <label>QR Hash:</label>
                <code>${entry.verification_data.qr_hash}...</code>
              </div>
              <div class="verification-row">
                <label>Random Seed:</label>
                <code>${entry.verification_data.random_seed}</code>
              </div>
              <div class="verification-row">
                <label>Combined:</label>
                <code>${entry.verification_data.combined_hash.substring(0, 32)}...</code>
              </div>
              <p class="text-xs text-gray mt-1">
                This hash proves the result was determined by code, not humans.
              </p>
            </div>
          </li>
        `;
      });

      container.innerHTML = html;
    } catch (error) {
      console.error('Failed to load audit log:', error);
      container.innerHTML = '<p class="text-center text-gray">Failed to load audit log</p>';
    }
  },

  /**
   * Toggle verification details visibility
   * @param {number} index - Entry index
   */
  toggleVerification(index) {
    const details = document.getElementById(`verification-${index}`);
    if (details) {
      details.classList.toggle('show');
    }
  },

  /**
   * Initialize admin page
   */
  _initAdminPage() {
    // Initialize QR version toggle
    this._initQRVersionToggle();

    // Generate QR codes button
    const generateBtn = document.getElementById('generate-qr-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateQRCodes());
    }

    // Reset data button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetDemoData());
    }

    // Load existing transactions
    this.loadAdminTransactions();
  },

  /**
   * Initialize QR format version toggle on admin page
   */
  _initQRVersionToggle() {
    const currentVersion = this.getQRFormatVersion();

    // Set initial radio button state
    const radioEl = document.getElementById(`qr-${currentVersion}`);
    if (radioEl) radioEl.checked = true;

    // Add change listeners
    document.querySelectorAll('input[name="qr-version"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.setQRFormatVersion(e.target.value);
        this.showToast(`Switched to QR format ${e.target.value}`, 'success');
      });
    });
  },

  /**
   * Generate QR codes for testing
   */
  async generateQRCodes() {
    const container = document.getElementById('qr-grid');
    const countInput = document.getElementById('qr-count');
    const count = parseInt(countInput?.value) || 5;

    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const qrCodes = QRGenerator.generateMultiple(count);
      const version = this.getQRFormatVersion();

      let html = '';
      qrCodes.forEach(qr => {
        // For v2, show a shortened display of the receipt number
        let displayText = qr.code;
        if (qr.version === 'v2' && qr.data) {
          displayText = `Receipt: ${qr.data.rcptNum}`;
        }

        html += `
          <div class="qr-card">
            <div class="qr-version-tag ${qr.version}">${qr.version}</div>
            <img src="${qr.url}" alt="QR Code" loading="lazy">
            <div class="qr-code-text">${displayText}</div>
          </div>
        `;
      });

      container.innerHTML = html;
      this.showToast(`Generated ${count} QR codes (${version} format)`, 'success');
    } catch (error) {
      console.error('Failed to generate QR codes:', error);
      container.innerHTML = '<p class="text-center text-gray">Failed to generate QR codes</p>';
    }
  },

  /**
   * Load admin transactions view
   */
  async loadAdminTransactions() {
    const container = document.getElementById('transactions-table');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SCAN_HISTORY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="text-center text-gray">No transactions yet.</p>';
      return;
    }

    let html = `
      <table class="transactions-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Phone</th>
            <th>Result</th>
            <th>Prize</th>
          </tr>
        </thead>
        <tbody>
    `;

    history.slice(-50).reverse().forEach(entry => {
      const time = new Date(entry.timestamp).toLocaleString('en-GH', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      html += `
        <tr>
          <td>${time}</td>
          <td>${entry.phone}</td>
          <td><span class="badge badge-${entry.result === 'WIN' ? 'green' : 'gray'}">${entry.result}</span></td>
          <td>${entry.prize || '-'}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  /**
   * Reset demo data
   */
  resetDemoData() {
    if (confirm('Are you sure you want to reset all demo data? This cannot be undone.')) {
      API.clearDemoData();
      this.userPhone = null;
      this.isRegistered = false;
      this.totalScans = 0;
      this.totalWins = 0;
      this.showToast('Demo data reset successfully', 'success');
      this.loadAdminTransactions();

      // Clear QR grid
      const qrGrid = document.getElementById('qr-grid');
      if (qrGrid) {
        qrGrid.innerHTML = '<p class="text-center text-gray">Generate QR codes to get started</p>';
      }
    }
  },

  /**
   * Log out user
   */
  logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.PHONE);
    this.userPhone = null;
    this.isRegistered = false;
    window.location.href = 'index.html';
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
