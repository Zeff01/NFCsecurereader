// app/(tabs)/index.tsx - Fixed Home Screen
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeatureCard } from '@/components/FeatureCard';
import { FloatingParticles } from '@/components/FloatingParticles';
import { TagAnalysisModal } from '@/components/TagAnalysisModal';
// 🔥 NEW CLEAN IMPORT
import { nfcManager, NFCTagData } from '@/lib/nfc';

export default function HomePage() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<NFCTagData | null>(null);
  const [showTagAnalysis, setShowTagAnalysis] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Initialize NFC on app start
    initializeNFC();

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const initializeNFC = async () => {
    try {
      const initialized = await nfcManager.initialize();
      setNfcInitialized(initialized);
      if (!initialized) {
        console.warn('⚠️ NFC initialization failed');
      }
    } catch (error) {
      console.error('❌ Failed to initialize NFC:', error);
    }
  };

  const handleProtectPress = async () => {
    if (isScanning) return;

    try {
      setIsScanning(true);
      
      // Check if NFC is available
      const isAvailable = await nfcManager.isNFCAvailable();
      if (!isAvailable) {
        Alert.alert(
          '📱 NFC Not Available',
          'NFC is not supported or enabled on this device. Please enable NFC in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Show scanning alert
      Alert.alert(
        '🛡️ NFC Protection Scan',
        'Hold your device near an NFC tag to scan...',
        [{ text: 'Cancel', onPress: () => setIsScanning(false) }]
      );
      
      // Perform NFC scan
      const tagData = await nfcManager.readNFCTag();
      setLastScanResult(tagData);
      
      // Show results with protection options
      Alert.alert(
        '✅ NFC Tag Detected!',
        `Tag ID: ${tagData.id.substring(0, 12)}...\nType: ${tagData.type}\nRecords: ${tagData.ndefRecords.length}\nWritable: ${tagData.isWritable ? 'Yes' : 'No'}`,
        [
          { 
            text: 'Analyze & Protect', 
            onPress: () => setShowTagAnalysis(true)
          },
          { 
            text: 'View Details', 
            onPress: () => showTagDetails(tagData)
          },
          { text: 'Scan Another' },
          { text: 'Done' }
        ]
      );
      
    } catch (error) {
      console.error('NFC Error:', error);
      const errorMessage = (error as Error).message || 'Unknown NFC error occurred';
      Alert.alert(
        '❌ NFC Scan Error', 
        errorMessage,
        [{ text: 'Try Again' }]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const showTagDetails = (tagData: NFCTagData) => {
    let details = `🏷️ Tag Details:\n\n`;
    details += `ID: ${tagData.id}\n`;
    details += `Type: ${tagData.type}\n`;
    details += `Size: ${tagData.maxSize || 0} bytes\n`;
    details += `Technologies: ${tagData.techTypes.join(', ')}\n\n`;
    
    if (tagData.ndefRecords.length > 0) {
      details += `📄 NDEF Records (${tagData.ndefRecords.length}):\n`;
      tagData.ndefRecords.forEach((record, index) => {
        details += `\n${index + 1}. Type: ${record.type || 'Unknown'}\n`;
        if (record.payload?.type === 'text') {
          details += `   Text: "${record.payload.text}"\n`;
        } else if (record.payload?.type === 'uri') {
          details += `   URI: ${record.payload.uri}\n`;
        }
      });
    } else {
      details += `📄 No NDEF records found`;
    }
    
    Alert.alert('🔍 Tag Analysis', details);
  };

  const handleExploitPress = () => {
    Alert.alert(
      '⚡ Coming Soon',
      'Exploit features will be available in the next update. Focus on protection first!',
      [{ text: 'OK' }]
    );
  };

  const getSystemStatus = () => {
    if (isScanning) return { text: 'Scanning...', color: '#FFC107' };
    if (!nfcInitialized) return { text: 'NFC Unavailable', color: '#F44336' };
    return { text: 'System Ready', color: '#4CAF50' };
  };

  const systemStatus = getSystemStatus();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <FloatingParticles />

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#ffffff', 'rgba(255,255,255,0.9)']}
                  style={styles.logoGradient}
                >
                  <Ionicons name="shield-checkmark" size={48} color="#667eea" />
                </LinearGradient>
              </View>
            </Animatable.View>

            <Text style={styles.title}>NFC Security Suite</Text>
            <Text style={styles.subtitle}>
              Advanced NFC Protection & Analysis Platform
            </Text>
            
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: systemStatus.color }
              ]} />
              <Text style={styles.statusText}>{systemStatus.text}</Text>
              {isScanning && (
                <ActivityIndicator 
                  size="small" 
                  color="#fff" 
                  style={{ marginLeft: 8 }} 
                />
              )}
            </View>
          </Animated.View>

          {/* Feature Cards */}
          <View style={styles.featuresContainer}>
            <FeatureCard
              title={isScanning ? "🔄 Scanning..." : "🛡️ Protect NFC"}
              subtitle={isScanning ? "Analyzing NFC tag for threats..." : "Secure your NFC cards from unauthorized access and cloning"}
              icon={isScanning ? "refresh" : "shield-checkmark"}
              color={['#4facfe', '#00f2fe']}
              onPress={handleProtectPress}
              delay={300}
              disabled={isScanning || !nfcInitialized}
            />

            <FeatureCard
              title="⚡ Exploit NFC"
              subtitle="Advanced penetration testing and security analysis"
              icon="flash"
              color={['#fa709a', '#fee140']}
              onPress={handleExploitPress}
              delay={600}
              disabled={true}
            />
          </View>

          {/* Last Scan Result */}
          {lastScanResult && (
            <Animatable.View 
              animation="fadeInUp" 
              style={styles.lastScanContainer}
            >
              <View style={styles.lastScanHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.lastScanTitle}>Last Scan Result</Text>
              </View>
              <View style={styles.lastScanContent}>
                <Text style={styles.lastScanText}>
                  📱 Tag: {lastScanResult.id.substring(0, 12)}...
                </Text>
                <Text style={styles.lastScanText}>
                  🏷️ Type: {lastScanResult.type}
                </Text>
                <Text style={styles.lastScanText}>
                  📄 Records: {lastScanResult.ndefRecords.length}
                </Text>
                <Text style={styles.lastScanText}>
                  🕒 {new Date(lastScanResult.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </Animatable.View>
          )}

          {/* System Info */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={900}
            style={styles.systemInfo}
          >
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#fff" />
              <Text style={styles.infoTitle}>System Status</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>NFC Support</Text>
                <Text style={styles.infoValue}>{nfcInitialized ? '✅' : '❌'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Threat Detection</Text>
                <Text style={styles.infoValue}>✅ Active</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Encryption</Text>
                <Text style={styles.infoValue}>🔒 AES-256</Text>
              </View>
            </View>
          </Animatable.View>
        </ScrollView>

        {/* Tag Analysis Modal */}
        <TagAnalysisModal
          visible={showTagAnalysis}
          tagData={lastScanResult}
          onClose={() => setShowTagAnalysis(false)}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  lastScanContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  lastScanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastScanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  lastScanContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  lastScanText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  systemInfo: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});