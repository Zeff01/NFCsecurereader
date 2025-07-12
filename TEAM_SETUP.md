# 👥 Team Setup Guide

Quick setup guide for new team members to get the NFC Security Suite running on their MacBook.

## 🎯 Scenario-Based Setup

### Scenario 1: Same Apple Developer Account ✅

**Use this if**: You have access to the original Apple ID (`jzeffsomera@gmail.com`)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite

# 2. Install dependencies
npm install
npm install -g eas-cli

# 3. Login with SAME Apple ID
eas login
# Email: jzeffsomera@gmail.com
# Password: [original password]

# 4. Register your device
eas device:create
# Scan QR code on your iPhone

# 5. Build for your device
eas build --profile development --platform ios

# 6. Install and test
npx expo start --dev-client
```

### Scenario 2: Different Apple ID 🔄

**Use this if**: You want to use your own Apple Developer account

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite
npm install

# 2. Update app.json - Change bundle identifier
```

Edit `app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.YOURNAME.nfcsecurereader.app"
    },
    "android": {
      "package": "com.YOURNAME.nfcsecurereader.app"
    }
  }
}
```

```bash
# 3. Install EAS and login with YOUR Apple ID
npm install -g eas-cli
eas login
# Email: your-apple-id@email.com
# Password: [your password]

# 4. Configure EAS project
eas build:configure

# 5. Register your device
eas device:create

# 6. Build with your credentials
eas build --profile development --platform ios
```

### Scenario 3: New Device, Same Account 📱

**Use this if**: Same Apple ID but different iPhone

```bash
# 1-3. Follow Scenario 1 steps 1-3

# 4. Register the new iPhone
eas device:create
# Make sure to use the NEW iPhone

# 5. Rebuild to include new device
eas build --profile development --platform ios
```

## 🚨 Common Issues & Solutions

### Issue: "EACCES permission denied"
```bash
# Solution: Use npx instead of global install
npx eas-cli login
npx eas-cli build --profile development --platform ios
```

### Issue: "Bundle identifier already exists"
```bash
# Solution: Change bundle ID in app.json
"bundleIdentifier": "com.YOURNAME.nfcsecurereader.app"
```

### Issue: "Build failed - Pod installation"
```bash
# Solution: Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
eas build --profile development --platform ios --clear-cache
```

### Issue: "Device not registered"
```bash
# Solution: Register device first
eas device:create
# Then rebuild
```

## ⚡ Quick Commands Cheat Sheet

```bash
# Essential commands
eas login                                    # Login to Expo
eas device:create                            # Register iPhone
eas build --profile development --platform ios  # Build for iOS
npx expo start --dev-client                 # Start dev server

# Troubleshooting
eas build:list                              # Check build status
eas build --clear-cache                     # Clear build cache
eas device:list                             # List registered devices
```

## 📋 Pre-Setup Checklist

Before starting, make sure you have:

- [ ] **macOS** (required for iOS builds)
- [ ] **Node.js 18+** installed
- [ ] **iPhone 7+** with iOS 11+
- [ ] **Apple ID** (free account works)
- [ ] **NFC tags** for testing
- [ ] **Same WiFi** for computer and phone

## 🔐 Apple ID Management

### If Using Original Account:
- Ask team lead for Apple ID credentials
- Use 2FA codes when prompted
- Don't change account settings

### If Using Your Own Account:
- Use your personal Apple ID (free)
- Change bundle identifier to avoid conflicts
- Create your own EAS project

## 📱 Testing Checklist

After setup, verify:

- [ ] App installs on iPhone
- [ ] QR code scanning works
- [ ] NFC reading works with real tags
- [ ] Security features function
- [ ] Logs are recorded

## 🤝 Team Collaboration

### Sharing Builds:
```bash
# Share build URL with team
eas build:list
# Copy download link from latest build
```

### Code Changes:
```bash
# For code changes (no rebuild needed)
git pull origin main
npx expo start --dev-client
```

### New Features (rebuild needed):
```bash
git pull origin main
npm install
eas build --profile development --platform ios
```

## 📞 Getting Help

**Stuck?** Contact:
- **Slack**: #nfc-app-dev
- **Email**: team-lead@company.com
- **GitHub Issues**: Create issue with error logs

**Include in help requests:**
- Error message (screenshot)
- Platform (iOS/Android)
- Build URL (if build failed)
- Steps to reproduce

---

**💡 Pro Tip**: Use `npx eas-cli` commands to avoid global installation permission issues!