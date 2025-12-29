/**
 * Ghana E-VAT Receipt Lottery - QR Scanner Module
 * Handles camera-based QR code scanning using html5-qrcode library
 */

/**
 * QR Code Parser - Handles both v1 and v2 QR code formats
 */
const QRParser = {
  /**
   * Parse a scanned QR code and determine its version
   * @param {string} qrContent - Raw content from QR scanner
   * @returns {Object} Parsed result with version and data
   */
  parse(qrContent) {
    // Check if it's v2 (URL format)
    if (this.isV2Format(qrContent)) {
      return {
        version: 'v2',
        valid: true,
        data: this.parseV2URL(qrContent),
        raw: qrContent
      };
    }

    // Check if it's v1 format
    if (this.isV1Format(qrContent)) {
      return {
        version: 'v1',
        valid: true,
        data: { code: qrContent },
        raw: qrContent
      };
    }

    // Unknown format
    return {
      version: 'unknown',
      valid: false,
      data: null,
      raw: qrContent,
      error: 'Unrecognized QR code format'
    };
  },

  /**
   * Check if content matches v2 (realistic) URL format
   */
  isV2Format(content) {
    const urlPattern = /^https?:\/\/(evat\.gra\.gov\.gh|vsdc\.vat-gh\.com)\/verify\?/i;
    return urlPattern.test(content);
  },

  /**
   * Check if content matches v1 format
   */
  isV1Format(content) {
    const v1Pattern = /^GRA-VAT-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return v1Pattern.test(content);
  },

  /**
   * Parse v2 URL format
   */
  parseV2URL(urlString) {
    try {
      const url = new URL(urlString);
      const params = url.searchParams;

      return {
        sdcId: params.get('sdc'),
        rcptNum: params.get('rcpt'),
        internalData: params.get('data'),
        ts: params.get('ts'),
        sig: params.get('sig'),
        timestampFormatted: this.formatTimestamp(params.get('ts'))
      };
    } catch (e) {
      console.error('Failed to parse v2 URL:', e);
      return null;
    }
  },

  /**
   * Format compact timestamp to readable date
   */
  formatTimestamp(ts) {
    if (!ts || ts.length < 14) return 'Unknown';
    try {
      const year = ts.substring(0, 4);
      const month = ts.substring(4, 6);
      const day = ts.substring(6, 8);
      const hour = ts.substring(8, 10);
      const min = ts.substring(10, 12);
      const sec = ts.substring(12, 14);
      return `${year}/${month}/${day} ${hour}:${min}:${sec}`;
    } catch (e) {
      return 'Unknown';
    }
  },

  /**
   * Generate a unique identifier for lottery from parsed data
   * This is used for duplicate detection and lottery seeding
   */
  getUniqueId(parsedData) {
    if (parsedData.version === 'v2') {
      return parsedData.data.rcptNum;
    } else if (parsedData.version === 'v1') {
      return parsedData.data.code;
    }
    return null;
  }
};

const Scanner = {
  html5QrCode: null,
  isScanning: false,
  onScanCallback: null,
  containerId: 'qr-reader',

  /**
   * Initialize the scanner
   * @param {string} containerId - ID of the container element
   * @param {function} onScan - Callback function when QR is scanned
   */
  init(containerId, onScan) {
    this.containerId = containerId;
    this.onScanCallback = onScan;

    // Check if html5-qrcode is loaded
    if (typeof Html5Qrcode === 'undefined') {
      console.error('Html5Qrcode library not loaded');
      return false;
    }

    this.html5QrCode = new Html5Qrcode(containerId);
    return true;
  },

  /**
   * Start the camera scanner
   * @returns {Promise<boolean>} Success status
   */
  async start() {
    if (this.isScanning) {
      console.log('Scanner already running');
      return true;
    }

    try {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          this._onScanSuccess(decodedText, decodedResult);
        },
        (errorMessage) => {
          // QR code scan error - ignore, keep scanning
        }
      );

      this.isScanning = true;
      console.log('Scanner started successfully');
      return true;
    } catch (err) {
      console.error('Failed to start scanner:', err);

      // Try with user-facing camera as fallback
      try {
        await this.html5QrCode.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => this._onScanSuccess(decodedText),
          () => { }
        );
        this.isScanning = true;
        return true;
      } catch (fallbackErr) {
        console.error('Failed to start scanner with fallback:', fallbackErr);
        return false;
      }
    }
  },

  /**
   * Stop the scanner
   * @returns {Promise<boolean>} Success status
   */
  async stop() {
    if (!this.isScanning) {
      return true;
    }

    try {
      await this.html5QrCode.stop();
      this.isScanning = false;
      console.log('Scanner stopped');
      return true;
    } catch (err) {
      console.error('Failed to stop scanner:', err);
      return false;
    }
  },

  /**
   * Pause scanning temporarily
   */
  async pause() {
    if (this.isScanning) {
      await this.html5QrCode.pause(true);
    }
  },

  /**
   * Resume scanning
   */
  resume() {
    if (this.html5QrCode) {
      this.html5QrCode.resume();
    }
  },

  /**
   * Handle successful scan
   * @param {string} decodedText - The scanned QR code content
   * @param {Object} decodedResult - Additional scan details
   */
  _onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code scanned:', decodedText);

    // Vibrate on scan (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Pause scanning while processing
    this.pause();

    // Invoke callback
    if (this.onScanCallback) {
      this.onScanCallback(decodedText);
    }
  },

  /**
   * Check if camera is available
   * @returns {Promise<boolean>}
   */
  async checkCameraAvailable() {
    try {
      const devices = await Html5Qrcode.getCameras();
      return devices && devices.length > 0;
    } catch (err) {
      console.error('Error checking cameras:', err);
      return false;
    }
  },

  /**
   * Get list of available cameras
   * @returns {Promise<Array>}
   */
  async getCameras() {
    try {
      return await Html5Qrcode.getCameras();
    } catch (err) {
      console.error('Error getting cameras:', err);
      return [];
    }
  },

  /**
   * Process a manually entered or file-based QR code
   * @param {string} qrCode - QR code content
   */
  processManualCode(qrCode) {
    if (this.onScanCallback) {
      this.onScanCallback(qrCode);
    }
  },

  /**
   * Scan from image file
   * @param {File} imageFile - Image file containing QR code
   * @returns {Promise<string>} Decoded QR content
   */
  async scanFile(imageFile) {
    if (!this.html5QrCode) {
      this.html5QrCode = new Html5Qrcode('qr-reader-file');
    }

    try {
      const decodedText = await this.html5QrCode.scanFile(imageFile, true);
      return decodedText;
    } catch (err) {
      console.error('Error scanning file:', err);
      throw new Error('Could not read QR code from image');
    }
  },

  /**
   * Clean up resources
   */
  destroy() {
    if (this.html5QrCode) {
      this.stop();
      this.html5QrCode = null;
    }
    this.isScanning = false;
    this.onScanCallback = null;
  }
};

/**
 * QR Code Generator for demo purposes
 */
const QRGenerator = {
  /**
   * Generate QR code image URL using a free API
   * @param {string} data - Data to encode
   * @param {number} size - Image size in pixels
   * @returns {string} QR code image URL
   */
  getQRCodeUrl(data, size = 200) {
    // Using QR Server API (free, no auth required)
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
  },

  /**
   * Generate multiple QR codes
   * @param {Array<string>} codes - Array of codes to generate
   * @param {number} size - Image size
   * @returns {Array<Object>} Array of QR code objects with code and url
   */
  generateBatch(codes, size = 200) {
    return codes.map(code => ({
      code: code,
      url: this.getQRCodeUrl(code, size)
    }));
  },

  /**
   * Generate a valid GRA VAT QR code (v1 format)
   * @returns {string} Valid QR code string
   */
  generateValidCode() {
    const version = this.getQRFormatVersion();
    if (version === 'v2') {
      return this.generateV2Code().url;
    }
    return this.generateV1Code();
  },

  /**
   * Generate v1 format code (simple text)
   * @returns {string} V1 format code
   */
  generateV1Code() {
    const year = new Date().getFullYear();
    return `GRA-VAT-${year}-${this._randomAlphanumeric(4)}-${this._randomAlphanumeric(4)}-${this._randomAlphanumeric(4)}`;
  },

  /**
   * Generate v2 format code (realistic URL format)
   * @returns {Object} Object with url and data properties
   */
  generateV2Code() {
    const sdcId = this._generateSDCId();
    const rcptNum = this._generateReceiptNumber();
    const internalData = this._generateInternalData();
    const ts = this._generateTimestamp();
    const sig = this._generateSignature();

    const url = `${CONFIG.QR_V2_SETTINGS.BASE_URL}?sdc=${sdcId}&rcpt=${encodeURIComponent(rcptNum)}&data=${internalData}&ts=${ts}&sig=${sig}`;

    return {
      url: url,
      data: { sdcId, rcptNum, internalData, ts, sig }
    };
  },

  /**
   * Generate 8-digit SDC ID
   * @returns {string}
   */
  _generateSDCId() {
    const min = CONFIG.QR_V2_SETTINGS.SDC_ID_MIN;
    const max = CONFIG.QR_V2_SETTINGS.SDC_ID_MAX;
    return String(Math.floor(Math.random() * (max - min)) + min);
  },

  /**
   * Generate receipt number: XXXX-XXXX-XXXXX
   * @returns {string}
   */
  _generateReceiptNumber() {
    const block1 = this._randomAlphanumeric(4);
    const block2 = this._randomAlphanumeric(4);
    const block3 = this._randomAlphanumeric(5);
    return `${block1}-${block2}-${block3}`;
  },

  /**
   * Generate internal data: XXXXXXXX-XXX-XXXX
   * @returns {string}
   */
  _generateInternalData() {
    const block1 = this._randomAlphanumeric(8);
    const block2 = this._randomAlphanumeric(3);
    const block3 = this._randomAlphanumeric(4);
    return `${block1}-${block2}-${block3}`;
  },

  /**
   * Generate compact timestamp: YYYYMMDDHHmmss
   * @returns {string}
   */
  _generateTimestamp() {
    const now = new Date();
    // Randomize within last 30 days for variety
    now.setDate(now.getDate() - Math.floor(Math.random() * 30));
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  },

  /**
   * Generate signature (16 chars alphanumeric)
   * @returns {string}
   */
  _generateSignature() {
    return this._randomAlphanumeric(4) + this._randomAlphanumeric(4) +
           this._randomAlphanumeric(4) + this._randomAlphanumeric(4);
  },

  /**
   * Generate random alphanumeric string
   * @param {number} length
   * @returns {string}
   */
  _randomAlphanumeric(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Get current QR format version setting
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
   * Generate multiple valid codes
   * @param {number} count - Number of codes to generate
   * @returns {Array<Object>} Array of code objects
   */
  generateMultiple(count) {
    const codes = [];
    const version = this.getQRFormatVersion();

    for (let i = 0; i < count; i++) {
      if (version === 'v2') {
        const v2 = this.generateV2Code();
        codes.push({
          code: v2.url,
          url: this.getQRCodeUrl(v2.url),
          version: 'v2',
          data: v2.data
        });
      } else {
        const code = this.generateV1Code();
        codes.push({
          code: code,
          url: this.getQRCodeUrl(code),
          version: 'v1'
        });
      }
    }
    return codes;
  }
};
