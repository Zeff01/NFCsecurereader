# 👥 NFC Security Suite - Team Setup Guide

Complete setup guide for developers to get the NFC Security Suite running on their development environment with all build variations and troubleshooting solutions.

## 📋 Project Overview

**Tech Stack:**
- React Native 0.73.4 + Expo SDK 50
- NFC functionality via react-native-nfc-manager
- Security features (Face ID, Secure Storage)
- Cross-platform (iOS/Android)

**Package.json Scripts:**
```json
{
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android", 
    "ios": "expo run:ios",
    "android:device": "expo run:android --device",
    "android:release": "expo run:android --variant release",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "build:all": "eas build --platform all",
    "prebuild": "expo prebuild --clean",
    "clean": "rm -rf node_modules package-lock.json && npm install",
    "dev:web": "expo start --web"
  }
}
```

## 🎯 Setup Scenarios

### Scenario 1: Same Apple Developer Account ✅

**Use this if**: You have access to the original Apple ID (`jzeffsomera@gmail.com`)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite

# 2. Install dependencies (stable versions)
npm install --legacy-peer-deps
npm install -g eas-cli watchman

# 3. Login with SAME Apple ID
eas login
# Email: jzeffsomera@gmail.com
# Password: [original password]

# 4. Register your device
eas device:create
# Scan QR code on your iPhone

# 5. Build development version
eas build --profile development --platform ios

# 6. Start development server
npm start
```

### Scenario 2: Different Apple ID 🔄

**Use this if**: You want to use your own Apple Developer account

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite
npm install --legacy-peer-deps

# 2. Update app.json - Change bundle identifier
```

Edit `app.json`:
```json
{
  "expo": {
    "name": "YourNFCApp",
    "slug": "your-nfc-app",
    "ios": {
      "bundleIdentifier": "com.YOURNAME.nfcreader.app"
    },
    "android": {
      "package": "com.YOURNAME.nfcreader.app"
    },
    "extra": {
      "eas": {
        "projectId": "generate-new-id-here"
      }
    }
  }
}
```

```bash
# 3. Configure new EAS project
npm install -g eas-cli
eas login
# Email: your-apple-id@email.com

# 4. Initialize new project
eas build:configure

# 5. Register your device
eas device:create

# 6. Build with your credentials
eas build --profile development --platform ios
```

### Scenario 3: Local Development Only 💻

**Use this if**: You want to develop locally without EAS builds

```bash
# 1. Setup project
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite
npm install --legacy-peer-deps

# 2. Install additional local development tools
brew install watchman android-studio

# 3. Generate native code
npx expo prebuild --clean

# 4. Run on connected devices
npm run android:device  # For Android
npm run ios             # For iOS (requires Xcode)

# 5. Start development server
npm start
```

## 🔨 Build Variations

### Cloud Builds (EAS)

```bash
# Development builds (for testing)
eas build --profile development --platform ios
eas build --profile development --platform android

# Production builds (for app stores)
eas build --profile production --platform ios
eas build --profile production --platform android

# Preview builds (internal testing)
eas build --profile preview --platform android

# Build for all platforms
npm run build:all
```

### Local Builds

```bash
# Local Android development
npm run android:device        # Debug build on connected device
npm run android:release       # Release build on connected device

# Local iOS development (macOS only)
npm run ios                   # Debug build in simulator
npx expo run:ios --device     # Debug build on connected iPhone

# Generate standalone APK locally
cd android && ./gradlew assembleRelease && cd ..
# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### Development Server Variations

```bash
# Standard development server
npm start                     # Development build required

# Web development (no native features)
npm run dev:web              # Runs in browser

# Different Metro configurations
CHOKIDAR_USEPOLLING=true npm start    # For file watching issues
WATCHMAN_NO_LOCAL=1 npm start         # Bypass Watchman
expo start --dev-client --offline     # Offline mode
expo start --dev-client --clear       # Clear Metro cache
```

## 🚨 Common Issues & Solutions

### Dependency Issues
```bash
# Problem: npm install fails with peer dependency conflicts
# Solution: Use legacy peer deps
npm install --legacy-peer-deps

# Problem: Metro bundler file watching errors
# Solution: Install Watchman and increase file limits
brew install watchman
ulimit -n 32768

# Problem: React Native version conflicts
# Solution: Clean install with exact versions
npm run clean
npm install --legacy-peer-deps
```

### Build Issues
```bash
# Problem: iOS build fails with "ReactAppDependencyProvider" error
# Solution: Use compatible React Native version
npm install react-native@0.73.4

# Problem: Android build fails with Gradle errors
# Solution: Clean and rebuild
rm -rf android
npx expo prebuild --platform android --clean
npm run android:device

# Problem: EAS build queue too long
# Solution: Build locally
npm run android:release  # For Android APK
```

### Connection Issues
```bash
# Problem: App stuck on splash screen
# Solution: Manual reload and Watchman reset
watchman shutdown-server
# Then press 'r' in Metro terminal

# Problem: Development server not connecting
# Solution: Manual connection
# On device: Settings → Debug server host → Enter: YOUR_IP:8081

# Problem: Too many open files error
# Solution: Increase system limits
sudo sysctl -w kern.maxfiles=65536
ulimit -n 32768
```

### Platform-Specific Issues
```bash
# iOS: Certificate/provisioning issues
eas device:create                 # Re-register device
eas build --clear-cache          # Clear certificates

# Android: ADB device not found
adb devices                      # Check connection
adb kill-server && adb start-server  # Reset ADB

# NFC: Feature not working
# Ensure physical device (not simulator)
# Check app.json has NFC permissions
```

## ⚡ Quick Commands Reference

### Essential Commands
```bash
# Project setup
npm run clean                    # Clean install dependencies
npm run prebuild                 # Generate native code

# Development
npm start                        # Start Metro bundler
npm run android:device           # Run on Android device
npm run ios                      # Run on iOS simulator

# Building
npm run build:android            # Cloud build for Android
npm run build:ios               # Cloud build for iOS
eas build --profile production  # Production builds
```

### Troubleshooting Commands
```bash
# Diagnostics
eas build:list                   # Check build status
eas device:list                  # List registered devices
adb devices                      # Check Android connection
expo doctor                     # Check Expo setup

# Clean/Reset
watchman shutdown-server         # Reset Watchman
expo start --clear              # Clear Metro cache
rm -rf .expo                    # Clear Expo cache
```

### File Locations
```bash
# Important files
app.json                        # App configuration
eas.json                       # Build configuration
package.json                   # Dependencies & scripts

# Generated files
android/                       # Android native code
ios/                          # iOS native code
android/app/build/outputs/apk/ # Local APK builds
```

## 📱 Testing Scenarios

### Development Testing
```bash
# 1. Install development build on device
eas build --profile development --platform ios

# 2. Start development server
npm start

# 3. Connect app to server (scan QR or auto-connect)

# 4. Test features:
# - NFC tag reading
# - Face ID authentication
# - Secure storage
# - Navigation
```

### Production Testing
```bash
# 1. Generate production APK
npm run android:release
# Or use EAS: eas build --profile production --platform android

# 2. Install APK on test devices
# Share: android/app/build/outputs/apk/release/app-release.apk

# 3. Test without development server
# - All features should work offline
# - Performance optimized
# - Production-ready
```

## 🔐 Environment Configuration

### Required Environment Variables
```bash
# .env file (create if needed)
EXPO_PUBLIC_API_URL=https://your-api.com
EXPO_PUBLIC_APP_ENV=development
```

### Platform Requirements

**macOS (for iOS development):**
- Xcode 14+ (for iOS builds)
- iOS 11+ device for NFC
- Apple Developer account

**Windows/Linux (Android only):**
- Android Studio
- Android 7+ device for NFC
- Google Play Developer account (for publishing)

### Dependencies Explanation
```json
{
  "expo": "~50.0.0",              // Expo SDK - base platform
  "expo-dev-client": "~3.3.0",   // Custom development builds
  "expo-router": "~3.4.0",       // File-based routing
  "react-native": "0.73.4",      // Stable RN version for Expo 50
  "react-native-gesture-handler": "~2.14.0",  // Touch gestures
  "react-native-reanimated": "~3.6.0",       // Animations
  "react-native-safe-area-context": "4.8.2", // Safe areas
  "react-native-screens": "~3.29.0"          // Native navigation
}
```

## 🚀 Advanced Workflows

### Feature Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/new-nfc-feature

# 2. Develop with hot reload
npm start
# Make changes, see updates instantly

# 3. Test on device
# Changes reflect immediately via Metro

# 4. Build for testing
eas build --profile development --platform ios

# 5. Share build with team
eas build:list  # Get download link
```

### Release Workflow
```bash
# 1. Merge to main branch
git checkout main
git merge feature/new-nfc-feature

# 2. Update version
# Edit app.json: "version": "1.1.0"

# 3. Build production versions
eas build --profile production --platform all

# 4. Test production builds
# Download and test APK/IPA files

# 5. Submit to app stores
eas submit --platform ios
eas submit --platform android
```

## 📞 Getting Help

**Immediate Help:**
- Check this guide first
- Look at error logs carefully
- Try the suggested solutions

**Team Support:**
- **Slack**: #nfc-app-dev
- **Email**: tech-lead@company.com
- **GitHub Issues**: Create with full error logs

**External Resources:**
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

**Include in help requests:**
- Full error message (screenshot)
- Platform (iOS/Android/both)
- Build profile used
- Steps to reproduce
- Your package.json dependencies

---

**💡 Pro Tips:**
- Always use `--legacy-peer-deps` for npm install
- Keep Metro server running for faster development
- Use development builds for feature testing
- Generate production APKs for easy sharing
- Test NFC features only on physical devices