# E-VAT Receipt Lottery Demo Script

This document outlines how to run a compelling 5-minute demo of the Ghana E-VAT Receipt Lottery prototype.

## Before the Demo

### Preparation (5 minutes)

1. **Print QR Codes**
   - Open `admin.html` in a browser
   - Click "Generate QR Codes" to create 5 codes
   - Print them or display on a separate screen

2. **Clear Previous Data**
   - On the Admin page, click "Reset All Demo Data"
   - This ensures a fresh demo experience

3. **Test Camera**
   - Open `index.html` on a mobile device
   - Ensure camera permissions are granted
   - Verify QR scanning works

## Demo Flow

### Part 1: The Problem (30 seconds)

**Talking Points:**
- "Ghana loses significant revenue to the informal economy"
- "Consumers often don't request VAT receipts"
- "How do we incentivize people to ask for receipts?"

### Part 2: The Solution (30 seconds)

**Talking Points:**
- "What if every VAT receipt was a lottery ticket?"
- "Scan the QR code, instantly know if you've won"
- "No waiting for draws - instant gratification"

### Part 3: Live Demo (3 minutes)

#### Step 1: Registration
1. Open the lottery app on a phone
2. Show the Ghana-themed interface
3. Enter a phone number (e.g., 0241234567)
4. Click "Start Scanning"

**Say:** "Registration is simple - just your phone number. No complex signup."

#### Step 2: First Scan
1. Point camera at a printed QR code
2. Wait for the scan to process
3. Show the result (win or lose)

**If WIN:** "Look at that! Instant win! The confetti, the celebration - this is the dopamine hit that keeps people coming back."

**If LOSE:** "No win this time, but notice - we track their scan count. They're building up, gamifying the experience."

#### Step 3: Transparency Demo
1. Navigate to the Transparency page
2. Show the audit log
3. Click "Verify Hash" on an entry

**Say:** "This is crucial for trust. Every transaction has a cryptographic hash. No human picked the winner - the algorithm did, and anyone can verify it."

#### Step 4: Leaderboard
1. Navigate to the Leaderboard page
2. Show the rankings and badges

**Say:** "Gamification keeps people engaged. They're competing with friends, earning badges, climbing ranks."

### Part 4: Behind the Scenes (1 minute)

**Talking Points:**
- "The frontend is a simple PWA - works on any smartphone"
- "Backend runs on n8n with Google Sheets - scalable and auditable"
- "All transactions are logged and verifiable"
- "Prize pool comes from collected VAT - it pays for itself"

## Key Messages

1. **Instant Gratification**: "No waiting for weekly draws. Scan, know immediately."

2. **Transparency**: "Cryptographic hashes prove fairness. No rigged results."

3. **Gamification**: "Leaderboards and badges keep people engaged."

4. **Simplicity**: "Just a phone number and camera. Works on any smartphone."

5. **Self-Funding**: "Prizes come from the additional VAT collected."

## Handling Questions

**Q: What about fraud?**
A: Each QR code can only be scanned once. The system validates and prevents duplicates.

**Q: How are winners verified?**
A: Transaction hashes are publicly visible. Anyone can verify the algorithm determined the winner.

**Q: What's the win rate?**
A: Configurable. Demo is set to 10%, but can be adjusted based on prize pool.

**Q: How do people claim prizes?**
A: In production, airtime would be credited directly to their registered phone number.

## Technical Notes for IT Staff

- The demo runs entirely in the browser (demo mode)
- All data is stored in localStorage
- For production, connect to n8n backend
- Google Sheets provides auditable data storage
- PWA can be installed as an app on mobile devices

## After the Demo

1. Share the demo URL
2. Provide the QR codes for hands-on testing
3. Offer to show the admin interface
4. Discuss integration with existing GRA systems
