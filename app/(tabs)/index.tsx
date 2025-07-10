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
import { nfcManager, NFCTagData } from '@/lib/nfc-manager';

export default function HomePage() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<NFCTagData | null>(null);
  const [showTagAnalysis, setShowTagAnalysis] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
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

  const handleProtectPress = async () => {
    if (isScanning) return;

    try {
      setIsScanning(true);
      
      // Show scanning alert
      Alert.alert(
        '🛡️ NFC Protection Scan',
        'Scanning for NFC tags... This is a simulated scan in Expo Go.',
        [{ text: 'Cancel', onPress: () => setIsScanning(false) }]
      );
      
      // Perform NFC scan (simulated)
      const tagData = await nfcManager.readNFCTag();
      setLastScanResult(tagData);
      
      // Show results with protection options
      Alert.alert(
        '✅ NFC Tag Detected!',
        `Tag ID: ${tagData.id}\nType: ${tagData.type}\nRecords: ${tagData.ndefRecords.length}\nWritable: ${tagData.isWritable ? 'Yes' : 'No'}`,
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
      Alert.alert(
        '❌ NFC Scan Error', 
        (error as Error).message,
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
    details += `Size: ${tagData.maxSize} bytes\n`;
    details += `Technologies: ${tagData.techTypes.join(', ')}\n\n`;
    
    if (tagData.ndefRecords.length > 0) {
      details += `📄 NDEF Records (${tagData.ndefRecords.length}):\n`;
      tagData.ndefRecords.forEach((record, index) => {
        details += `\n${index + 1}. ${record.type || 'Unknown'}\n`;
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
                { backgroundColor: isScanning ? '#FFC107' : '#4CAF50' }
              ]} />
              <Text style={styles.statusText}>
                {isScanning ? 'Scanning...' : 'System Ready'}
              </Text>
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
              disabled={isScanning}
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

          {/* Protection Features Preview */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={900}
            style={styles.protectionPreview}
          >
            <View style={styles.previewHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
              <Text style={styles.previewTitle}>Protection Features</Text>
            </View>
            
            <View style={styles.featuresList}>
              {[
                'Multi-factor Authentication',
                'Biometric Security Lock',
                'Real-time Threat Detection',
                'Encrypted Data Storage',
                'Access Audit Logging',
                'Session Management'
              ].map((feature, index) => (
                <Animatable.View
                  key={feature}
                  animation="fadeInLeft"
                  delay={1200 + (index * 100)}
                  style={styles.featureItem}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>{feature}</Text>
                </Animatable.View>
              ))}
            </View>
          </Animatable.View>

          {/* Stats Section */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={1500}
            style={styles.statsContainer}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              style={styles.statsGradient}
            >
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>256</Text>
                <Text style={styles.statLabel}>Bit Encryption</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>99.9%</Text>
                <Text style={styles.statLabel}>Security Rate</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>24/7</Text>
                <Text style={styles.statLabel}>Protection</Text>
              </View>
            </LinearGradient>
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
  protectionPreview: {
    marginHorizontal: 20,
    marginTop: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 8,
  },
  statsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGradient: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
});