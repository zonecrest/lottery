# n8n Workflow Setup

This directory contains the n8n workflow for the Ghana E-VAT Receipt Lottery backend.

## Prerequisites

1. n8n Cloud account or self-hosted n8n instance
2. Google Cloud project with Sheets API enabled
3. Google Sheets OAuth2 credentials

## Setup Instructions

### 1. Import the Workflow

1. Open your n8n instance
2. Go to Workflows > Import from File
3. Select `lottery-workflow.json`
4. Click Import

### 2. Set Up Google Sheets

Create a Google Sheet with the following structure:

**Sheet 1: `scans`**
| timestamp | phone | qr_code | result | prize | transaction_hash |
|-----------|-------|---------|--------|-------|------------------|

**Sheet 2: `users`**
| phone | total_scans | total_wins | total_prize_value | first_scan | last_scan |
|-------|-------------|------------|-------------------|------------|-----------|

**Sheet 3: `audit_log`**
| timestamp | phone_masked | prize | transaction_hash | random_seed | verified |
|-----------|--------------|-------|------------------|-------------|----------|

### 3. Configure Credentials

1. In n8n, go to Credentials
2. Add new Google Sheets OAuth2 API credential
3. Follow the OAuth flow to connect your Google account
4. Name the credential "Google Sheets account"

### 4. Set Environment Variables

In your n8n instance, set these environment variables:

```
GOOGLE_SHEET_ID=your_google_sheet_id_here
```

You can find the Sheet ID in the Google Sheets URL:
`https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

### 5. Activate the Workflow

1. Open the imported workflow
2. Click "Activate" in the top right
3. Copy the webhook URLs shown

### 6. Configure Frontend

Update the frontend configuration in `frontend/js/config.js`:

```javascript
const CONFIG = {
  N8N_WEBHOOK_URL: 'https://your-instance.app.n8n.cloud/webhook',
  DEMO_MODE: false,
  // ... rest of config
};
```

## Webhook Endpoints

Once activated, you'll have these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook/scan` | POST | Submit a scanned QR code |
| `/webhook/leaderboard` | GET | Get leaderboard data |
| `/webhook/audit-log` | GET | Get audit log entries |
| `/webhook/generate-qr` | POST | Generate demo QR codes |

## Testing

1. Use the Admin page in the frontend to generate test QR codes
2. Scan them with the main app
3. Check the Google Sheet to see data being recorded

## Troubleshooting

**Webhook not responding:**
- Ensure the workflow is activated
- Check that CORS is properly configured

**Google Sheets errors:**
- Verify your OAuth credentials are valid
- Check that the sheet names match exactly
- Ensure the GOOGLE_SHEET_ID environment variable is set

**Rate limiting:**
- The workflow includes basic rate limiting logic
- Adjust MAX_SCANS_PER_HOUR in the code node if needed
