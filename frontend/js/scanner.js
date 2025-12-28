/**
 * Ghana E-VAT Receipt Lottery - QR Scanner Module
 * Handles camera-based QR code scanning using html5-qrcode library
 */

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
   * Generate a valid GRA VAT QR code
   * @returns {string} Valid QR code string
   */
  generateValidCode() {
    const year = new Date().getFullYear();
    const randomPart = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    return `GRA-VAT-${year}-${randomPart()}-${randomPart()}-${randomPart()}`;
  },

  /**
   * Generate multiple valid codes
   * @param {number} count - Number of codes to generate
   * @returns {Array<Object>} Array of code objects
   */
  generateMultiple(count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = this.generateValidCode();
      codes.push({
        code: code,
        url: this.getQRCodeUrl(code)
      });
    }
    return codes;
  }
};
