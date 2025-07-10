import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

import { SecurityFeatureCard } from '@/components/SecurityFeatureCard';
import { SecurityScore } from '@/components/SecurityScore';

interface SecurityFeature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
  critical: boolean;
}

interface SecuritySettings {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockEnabled: boolean;
  threatDetectionEnabled: boolean;
  encryptionEnabled: boolean;
  auditLoggingEnabled: boolean;
  autoLockTime: number;
}

export default function SecurityScreen() {
  const [features, setFeatures] = useState<SecurityFeature[]>([
    {
      id: 'biometric',
      title: 'Biometric Authentication',
      description: 'Use fingerprint or face recognition to secure access',
      icon: 'finger-print',
      enabled: false,
      critical: true,
    },
    {
      id: 'pin',
      title: 'PIN Protection',
      description: 'Set a secure PIN code for additional security',
      icon: 'keypad',
      enabled: false,
      critical: true,
    },
    {
      id: 'autolock',
      title: 'Auto-Lock',
      description: 'Automatically lock the app after inactivity',
      icon: 'lock-closed',
      enabled: true,
      critical: false,
    },
    {
      id: 'threat',
      title: 'Threat Detection',
      description: 'Real-time monitoring for suspicious NFC activities',
      icon: 'shield-checkmark',
      enabled: true,
      critical: true,
    },
    {
      id: 'encryption',
      title: 'Data Encryption',
      description: 'Encrypt all stored NFC data and logs',
      icon: 'lock-open',
      enabled: true,
      critical: true,
    },
    {
      id: 'audit',
      title: 'Audit Logging',
      description: 'Keep detailed logs of all security events',
      icon: 'document-text',
      enabled: true,
      critical: false,
    },
  ]);

  const [settings, setSettings] = useState<SecuritySettings>({
    biometricEnabled: false,
    pinEnabled: false,
    autoLockEnabled: true,
    threatDetectionEnabled: true,
    encryptionEnabled: true,
    auditLoggingEnabled: true,
    autoLockTime: 5,
  });

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
    loadSettings();
  }, []);

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (hasHardware && isEnrolled && supportedTypes.length > 0) {
      const type = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) 
        ? 'Face ID' 
        : 'Fingerprint';
      setBiometricType(type);
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await SecureStore.getItemAsync('security_settings');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings(parsedSettings);
        updateFeaturesFromSettings(parsedSettings);
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: SecuritySettings) => {
    try {
      await SecureStore.setItemAsync('security_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      updateFeaturesFromSettings(newSettings);
    } catch (error) {
      console.warn('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save security settings');
    }
  };

  const updateFeaturesFromSettings = (newSettings: SecuritySettings) => {
    setFeatures(prev => prev.map(feature => {
      switch (feature.id) {
        case 'biometric':
          return { ...feature, enabled: newSettings.biometricEnabled };
        case 'pin':
          return { ...feature, enabled: newSettings.pinEnabled };
        case 'autolock':
          return { ...feature, enabled: newSettings.autoLockEnabled };
        case 'threat':
          return { ...feature, enabled: newSettings.threatDetectionEnabled };
        case 'encryption':
          return { ...feature, enabled: newSettings.encryptionEnabled };
        case 'audit':
          return { ...feature, enabled: newSettings.auditLoggingEnabled };
        default:
          return feature;
      }
    }));
  };

  const handleFeatureToggle = async (featureId: string, enabled: boolean) => {
    if (featureId === 'biometric' && enabled) {
      await enableBiometric();
    } else if (featureId === 'pin' && enabled) {
      setShowPinModal(true);
    } else {
      const newSettings = { ...settings, [`${featureId}Enabled`]: enabled };
      await saveSettings(newSettings);
    }
  };

  const enableBiometric = async () => {
    try {
      setIsLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        const newSettings = { ...settings, biometricEnabled: true };
        await saveSettings(newSettings);
        Alert.alert('Success', `${biometricType} authentication enabled!`);
      } else {
        Alert.alert('Failed', 'Biometric authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pinInput.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits');
      return;
    }

    if (pinInput !== confirmPinInput) {
      Alert.alert('PIN Mismatch', 'PINs do not match');
      return;
    }

    try {
      setIsLoading(true);
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pinInput
      );
      
      await SecureStore.setItemAsync('app_pin_hash', pinHash);
      
      const newSettings = { ...settings, pinEnabled: true };
      await saveSettings(newSettings);
      
      setShowPinModal(false);
      setPinInput('');
      setConfirmPinInput('');
      Alert.alert('Success', 'PIN protection enabled!');
    } catch (error) {
      Alert.alert('Error', 'Failed to set PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityScore = () => {
    const enabledCritical = features.filter(f => f.critical && f.enabled).length;
    const totalCritical = features.filter(f => f.critical).length;
    return Math.round((enabledCritical / totalCritical) * 100);
  };

  const securityScore = getSecurityScore();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>NFC Protection</Text>
        <Text style={styles.headerSubtitle}>Advanced Security Features</Text>
        
        <SecurityScore score={securityScore} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          
          {features.map((feature, index) => (
            <SecurityFeatureCard
              key={feature.id}
              feature={feature}
              index={index}
              onToggle={handleFeatureToggle}
            />
          ))}
        </View>

        {/* Auto-Lock Settings */}
        <AutoLockSettings 
          autoLockTime={settings.autoLockTime}
          onTimeChange={(time) => {
            const newSettings = { ...settings, autoLockTime: time };
            saveSettings(newSettings);
          }}
        />

        {/* Security Tips */}
        <SecurityTips />

        {/* Emergency Reset */}
        <EmergencyReset 
          onReset={async () => {
            try {
              await SecureStore.deleteItemAsync('security_settings');
              await SecureStore.deleteItemAsync('app_pin_hash');
              const defaultSettings: SecuritySettings = {
                biometricEnabled: false,
                pinEnabled: false,
                autoLockEnabled: true,
                threatDetectionEnabled: true,
                encryptionEnabled: true,
                auditLoggingEnabled: true,
                autoLockTime: 5,
              };
              setSettings(defaultSettings);
              updateFeaturesFromSettings(defaultSettings);
              Alert.alert('Success', 'Security settings reset');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          }}
        />
      </ScrollView>

      {/* PIN Setup Modal */}
      <PinSetupModal
        visible={showPinModal}
        pinInput={pinInput}
        confirmPinInput={confirmPinInput}
        isLoading={isLoading}
        onPinChange={setPinInput}
        onConfirmPinChange={setConfirmPinInput}
        onSubmit={handleSetPin}
        onClose={() => {
          setShowPinModal(false);
          setPinInput('');
          setConfirmPinInput('');
        }}
      />
    </SafeAreaView>
  );
}

// Auto-Lock Settings Component
const AutoLockSettings: React.FC<{
  autoLockTime: number;
  onTimeChange: (time: number) => void;
}> = ({ autoLockTime, onTimeChange }) => (
  <Animatable.View animation="fadeInUp" delay={600} style={styles.settingsContainer}>
    <Text style={styles.sectionTitle}>Auto-Lock Settings</Text>
    
    <View style={styles.settingCard}>
      <Text style={styles.settingTitle}>Auto-lock after</Text>
      <View style={styles.timeOptions}>
        {[1, 5, 15, 30].map((minutes) => (
          <TouchableOpacity
            key={minutes}
            style={[
              styles.timeOption,
              autoLockTime === minutes && styles.timeOptionActive,
            ]}
            onPress={() => onTimeChange(minutes)}
          >
            <Text
              style={[
                styles.timeOptionText,
                autoLockTime === minutes && styles.timeOptionTextActive,
              ]}
            >
              {minutes}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </Animatable.View>
);

// Security Tips Component
const SecurityTips: React.FC = () => (
  <Animatable.View animation="fadeInUp" delay={800} style={styles.tipsContainer}>
    <Text style={styles.sectionTitle}>Security Tips</Text>
    
    {[
      'Enable all critical security features for maximum protection',
      'Use a unique PIN that you haven\'t used elsewhere',
      'Regularly check your audit logs for suspicious activity',
      'Keep your app updated to the latest security patches',
      'Never share your authentication credentials'
    ].map((tip, index) => (
      <View key={index} style={styles.tipItem}>
        <Ionicons name="bulb" size={16} color="#FFC107" />
        <Text style={styles.tipText}>{tip}</Text>
      </View>
    ))}
  </Animatable.View>
);

// Emergency Reset Component
const EmergencyReset: React.FC<{ onReset: () => void }> = ({ onReset }) => (
  <Animatable.View animation="fadeInUp" delay={1000} style={styles.emergencyContainer}>
    <TouchableOpacity
      style={styles.emergencyButton}
      onPress={() => {
        Alert.alert(
          'Emergency Reset',
          'This will reset all security settings. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: onReset }
          ]
        );
      }}
    >
      <Ionicons name="warning" size={20} color="#F44336" />
      <Text style={styles.emergencyText}>Emergency Reset</Text>
    </TouchableOpacity>
  </Animatable.View>
);

// PIN Setup Modal Component
const PinSetupModal: React.FC<{
  visible: boolean;
  pinInput: string;
  confirmPinInput: string;
  isLoading: boolean;
  onPinChange: (pin: string) => void;
  onConfirmPinChange: (pin: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({ 
  visible, 
  pinInput, 
  confirmPinInput, 
  isLoading, 
  onPinChange, 
  onConfirmPinChange, 
  onSubmit, 
  onClose 
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Set PIN Code</Text>
        <Text style={styles.modalSubtitle}>
          Create a secure PIN to protect your NFC data
        </Text>

        <View style={styles.pinInputContainer}>
          <Text style={styles.pinLabel}>Enter PIN (4-6 digits)</Text>
          <TextInput
            style={styles.pinInput}
            value={pinInput}
            onChangeText={onPinChange}
            placeholder="••••"
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
        </View>

        <View style={styles.pinInputContainer}>
          <Text style={styles.pinLabel}>Confirm PIN</Text>
          <TextInput
            style={styles.pinInput}
            value={confirmPinInput}
            onChangeText={onConfirmPinChange}
            placeholder="••••"
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.confirmButton]}
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Set PIN</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingsContainer: {
    marginBottom: 30,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  timeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: '#667eea',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeOptionTextActive: {
    color: '#fff',
  },
  tipsContainer: {
    marginBottom: 30,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  emergencyContainer: {
    marginBottom: 30,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  emergencyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  pinInputContainer: {
    marginBottom: 20,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pinInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});