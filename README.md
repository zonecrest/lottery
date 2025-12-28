# Ghana E-VAT Receipt Lottery Prototype

A complete working prototype demonstrating "Instant Win" lottery mechanics to gamify VAT tax compliance in Ghana.

## Overview

The E-VAT Receipt Lottery encourages consumers to request VAT receipts by offering instant prize opportunities. When a consumer scans the QR code on their VAT receipt, they have a chance to win airtime prizes instantly.

**Key Features:**
- QR code scanning from VAT receipts
- Instant win/lose result with celebratory animations
- Transparent, verifiable lottery results using cryptographic hashes
- Leaderboard with gamification badges
- Mobile-first PWA design

## Quick Start

### Option 1: Local Demo (No Backend Required)

1. Open `frontend/index.html` in a web browser
2. The app runs in demo mode with simulated data stored locally
3. Use `frontend/admin.html` to generate test QR codes

### Option 2: Deploy to Netlify

1. Push this repo to GitHub
2. Connect to Netlify
3. Deploy the `frontend/` directory
4. Access your live URL

### Option 3: Full Setup with n8n Backend

See [n8n/README.md](n8n/README.md) for backend setup instructions.

## Project Structure

```
ghana-lottery-prototype/
├── frontend/
│   ├── index.html              # Scanner page
│   ├── leaderboard.html        # Leaderboard page
│   ├── transparency.html       # Audit log page
│   ├── admin.html              # Demo admin page
│   ├── css/
│   │   └── styles.css          # All styles (Ghana themed)
│   ├── js/
│   │   ├── app.js              # Main app logic
│   │   ├── scanner.js          # QR scanning logic
│   │   ├── api.js              # Backend API calls
│   │   └── config.js           # Configuration
│   ├── assets/
│   │   ├── logo.svg            # App logo
│   │   └── icons/              # PWA icons
│   ├── manifest.json           # PWA manifest
│   └── netlify.toml            # Netlify config
├── n8n/
│   ├── lottery-workflow.json   # Importable n8n workflow
│   └── README.md               # n8n setup instructions
├── assets/
│   └── qr-codes/
│       └── codes.json          # Pre-generated QR codes
├── docs/
│   └── demo-script.md          # Demo walkthrough
└── README.md                   # This file
```

## Demo Scenario

1. **Setup**: Open admin page, generate 5 QR codes, print them
2. **User Registration**: Enter phone number on main page
3. **Scan Receipt**: Use camera to scan QR code
4. **Instant Result**:
   - WIN: Confetti celebration, prize announced
   - LOSE: Encouraging message, scan count displayed
5. **Verify**: Visit transparency page to see transaction hash
6. **Compete**: Check leaderboard ranking

## Technology Stack

**Frontend:**
- Plain HTML, CSS, JavaScript (no build tools)
- html5-qrcode for camera scanning
- canvas-confetti for celebrations
- PWA-ready with manifest

**Backend (optional):**
- n8n workflow automation
- Google Sheets for data storage
- Webhook API endpoints

## Configuration

Edit `frontend/js/config.js`:

```javascript
const CONFIG = {
  // Set to false to use real n8n backend
  DEMO_MODE: true,

  // n8n webhook URL (when not in demo mode)
  N8N_WEBHOOK_URL: 'https://your-instance.app.n8n.cloud/webhook',

  // Lottery settings
  WIN_PERCENTAGE: 10,  // 10% win rate
  PRIZES: {
    'GH₵5 Airtime': 70,   // 70% of wins
    'GH₵10 Airtime': 25,  // 25% of wins
    'GH₵50 Airtime': 5    // 5% of wins
  }
};
```

## Design

The interface uses Ghana's national colors:
- **Gold** (#FCD116) - Primary accent
- **Green** (#006B3F) - Primary brand color
- **Red** (#CE1126) - Alert/win accent
- **Black** (#000000) - Text and Ghana star

## Success Criteria

- [x] User can enter phone number and scan QR codes
- [x] Instant win/lose result with appropriate UI feedback
- [x] Win celebrations with confetti and haptic feedback
- [x] Leaderboard shows top scanners
- [x] Transparency page shows verifiable transaction hashes
- [x] Admin page can generate demo QR codes
- [x] n8n workflow is importable and functional
- [x] Mobile-first, works on typical Ghana smartphone
- [x] Demo can be run in under 5 minutes

## License

This prototype is provided for demonstration purposes.

---

Built with care for Ghana's digital transformation initiative.
