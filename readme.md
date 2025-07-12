# 🛡️ NFC Security Suite

A comprehensive React Native app for NFC tag reading, security analysis, and threat detection. Built with Expo and React Native, supporting both iOS and Android platforms.

## ✨ Features

- 🏷️ **Real NFC Tag Reading** - Read NDEF, text, and URI data from NFC tags
- 🔒 **Security Analysis** - Advanced threat detection and security level assessment
- 📊 **Access Logging** - Detailed logs of all NFC interactions
- 🛡️ **Threat Detection** - Real-time monitoring for suspicious activities
- 🔐 **Biometric Security** - Face ID/Touch ID authentication
- 📱 **Cross-Platform** - Works on both iOS (iPhone 7+) and Android devices
- 🎨 **Modern UI** - Beautiful gradient interface with animations

## 📋 Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **iOS Device** (iPhone 7 or newer) or **Android device** with NFC
- **Apple Developer Account** (free account works for development)
- **macOS** (for iOS builds)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install EAS CLI

```bash
# Install globally
npm install -g eas-cli

# Or use npx (no global install needed)
npx eas-cli --version
```

### 4. Login to Expo

```bash
eas login
# Enter your Expo account credentials
```

### 5. Build Development Client

#### For iOS:
```bash
eas build --profile development --platform ios
```

#### For Android:
```bash
eas build --profile development --platform android
```

### 6. Install on Device

- **iOS**: Download via TestFlight or direct install link
- **Android**: Download and install the APK file

### 7. Start Development Server

```bash
npx expo start --dev-client
```

### 8. Connect Your App

- Open your **custom development build** (not Expo Go)
- Scan the QR code from the terminal
- Start testing NFC functionality!

## 🔧 Configuration

### App Configuration (`app.json`)

```json
{
  "expo": {
    "name": "NFCSecureReader",
    "slug": "NFCSecureReader",
    "ios": {
      "bundleIdentifier": "com.nfcsecurereader.app",
      "infoPlist": {
        "NFCReaderUsageDescription": "This app uses NFC to securely read and analyze NFC tags"
      }
    },
    "android": {
      "package": "com.nfcsecurereader.app",
      "permissions": [
        "android.permission.NFC",
        "android.permission.VIBRATE"
      ]
    },
    "plugins": [
      "expo-router",
      ["react-native-nfc-manager", {
        "nfcPermission": "Allow NFC Secure Reader to interact with nearby NFC devices"
      }],
      ["expo-local-authentication", {
        "faceIDPermission": "Allow NFC Secure Reader to use Face ID for authentication"
      }],
      "expo-secure-store"
    ]
  }
}
```

## 📱 Supported Platforms

### iOS Requirements:
- iPhone 7 or newer
- iOS 11.0+
- NFC capability enabled

### Android Requirements:
- Android 4.4+ (API level 19)
- NFC hardware support
- NFC enabled in settings

## 🏗️ Project Structure

```
NFCSecureReader/
├── app/                    # App Router pages
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home screen
│   │   ├── security.tsx   # Security settings
│   │   └── logs.tsx       # Access logs
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── FeatureCard.tsx
│   ├── FloatingParticles.tsx
│   ├── TagAnalysisModal.tsx
│   ├── SecurityFeatureCard.tsx
│   └── SecurityScore.tsx
├── lib/                   # Core functionality
│   └── nfc-manager.ts     # NFC manager implementation
├── assets/               # Images and icons
├── app.json             # Expo configuration
├── eas.json             # EAS Build configuration
└── package.json         # Dependencies
```

## 🔐 Setting Up on a New MacBook

### Option 1: Same Apple Developer Account

If using the **same Apple ID** that built the app:

```bash
# 1. Clone and install
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite
npm install

# 2. Install EAS CLI
npm install -g eas-cli

# 3. Login with the SAME Apple ID
eas login

# 4. Register new device (if needed)
eas device:create

# 5. Build for the new device
eas build --profile development --platform ios
```

### Option 2: Different Apple Developer Account

If using a **different Apple ID**:

```bash
# 1. Clone and install
git clone https://github.com/yourusername/nfc-security-suite.git
cd nfc-security-suite
npm install

# 2. Update bundle identifier in app.json
# Change: "com.nfcsecurereader.app" 
# To: "com.yourname.nfcsecurereader.app"

# 3. Install EAS CLI and login
npm install -g eas-cli
eas login

# 4. Create new EAS project
eas build:configure

# 5. Register device
eas device:create

# 6. Build with new credentials
eas build --profile development --platform ios
```

### Option 3: Different Device (Same Account)

If same Apple ID but **different iPhone**:

```bash
# 1. Setup project (steps 1-3 from Option 1)

# 2. Register the new device
eas device:create

# 3. Build new version with updated provisioning
eas build --profile development --platform ios
```

## 🛠️ Development Commands

```bash
# Start development server
npm start

# Build for iOS
eas build --profile development --platform ios

# Build for Android  
eas build --profile development --platform android

# Register new device
eas device:create

# Clear build cache
eas build --profile development --platform ios --clear-cache

# Check build status
eas build:list
```

## 📊 NFC Tag Support

### Supported Tag Types:
- **MIFARE Classic**
- **MIFARE Ultralight** 
- **NTAG213/215/216**
- **ISO14443 Type A/B**
- **FeliCa**
- **ISO15693**

### Supported Data Formats:
- **NDEF Records**
- **Text Records**
- **URI Records**
- **Raw binary data**

## 🔒 Security Features

- **Real-time threat detection**
- **Cloning attempt monitoring**
- **Malformed data detection**
- **Access audit logging**
- **Biometric authentication**
- **Encrypted data storage**

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues:

#### "NFC not supported"
- Ensure device has NFC hardware
- Check iOS version (11+) or Android version (4.4+)

#### "Build failed - Pod installation"
- Run: `eas build --clear-cache`
- Remove `node_modules` and reinstall: `rm -rf node_modules && npm install`

#### "Device not registered"
- Run: `eas device:create`
- Follow the device registration flow

#### "Bundle identifier conflict"
- Change bundle ID in `app.json`
- Use format: `com.yourname.appname`

### Getting Help:

- 📧 **Email**: support@yourapp.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/nfc-security-suite/issues)
- 📖 **Docs**: [Expo Documentation](https://docs.expo.dev/)

## 🙏 Acknowledgments

- React Native NFC Manager
- Expo Development Tools
- React Native Community

---

**⚠️ Note**: This app requires a development build - it will NOT work with Expo Go due to native NFC module requirements.