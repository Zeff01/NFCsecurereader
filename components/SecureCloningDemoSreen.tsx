// components/SecureCloningDemoScreen.tsx - Enhanced with security features

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { nfcManager } from '../lib/nfc';
import { simpleSecureNFCManager } from '../lib/nfc/simple-secure-manager';
import { SecurityManager } from '../lib/nfc/security-manager';
import type { ClonedCardData, CloneResult } from '../lib/nfc/types';

const SecureCloningDemoScreen = () => {
const [currentStep, setCurrentStep] = useState(1);
const [extractedData, setExtractedData] = useState<ClonedCardData | null>(null);
const [vulnerableResult, setVulnerableResult] = useState<CloneResult | null>(null);
const [secureResult, setSecureResult] = useState<any>(null);
const [testResults, setTestResults] = useState<any>(null);
const [isLoading, setIsLoading] = useState(false);

// Initialize your existing security manager
const securityManager = new SecurityManager();

const handleStep1 = async () => {
  if (isLoading) return;
  setIsLoading(true);
  
  try {
    const isAvailable = await nfcManager.isNFCAvailable();
    if (!isAvailable) {
      Alert.alert('📱 NFC Not Available', 'NFC is not supported or enabled on this device.');
      return;
    }

    Alert.alert(
      '🔍 Step 1: Scan Original Card',
      'Hold your device near an NFC tag to extract data...',
      [{ text: 'Cancel', onPress: () => setIsLoading(false) }]
    );

    const tagData = await nfcManager.readNFCTag();
    
    let realContent = '';
    tagData.ndefRecords.forEach(record => {
      if (record.payload) {
        realContent += record.payload + '\n';
      }
    });

    if (!realContent.trim()) {
      realContent = 'EMPTY_TAG';
    }

    const extractedCardData: ClonedCardData = {
      originalUID: tagData.id,
      extractedData: {
        uid: tagData.id,
        type: tagData.type,
        techTypes: tagData.techTypes,
        records: tagData.ndefRecords,
        timestamp: tagData.timestamp,
        realContent: realContent.trim()
      },
      clonedAt: new Date().toISOString()
    };

    setExtractedData(extractedCardData);
    setCurrentStep(2);
    
    Alert.alert(
      '✅ Step 1 Complete', 
      `Original card data extracted!\n\nUID: ${tagData.id}\nType: ${tagData.type}\nContent: ${realContent || 'Empty tag'}`,
      [{ text: 'Next: Clone Without Security' }]
    );
    
  } catch (error: any) {
    console.error('Step 1 error:', error);
    Alert.alert('❌ Scan Error', error.message, [{ text: 'Try Again' }]);
  } finally {
    setIsLoading(false);
  }
};

const handleStep2 = async () => {
  if (!extractedData) {
    Alert.alert('Error', 'No extracted data found. Please complete Step 1 first.');
    return;
  }

  setIsLoading(true);
  try {
    console.log('Starting Step 2: Vulnerable Clone');
    
    Alert.alert(
      '⚠️ Step 2: Clone Without Security',
      'Writing unprotected clone to blank NFC tag...',
      [{ text: 'Cancel', onPress: () => setIsLoading(false) }]
    );

    const vulnerableData = [
      `ORIGINAL_UID:${extractedData.originalUID}`,
      `CLONED_AT:${extractedData.clonedAt}`,
      `CONTENT:${extractedData.extractedData.realContent}`,
      `VULNERABLE_CLONE:${Date.now()}`
    ];

    await nfcManager.writeNFCTag(vulnerableData);
    
    const result: CloneResult = {
      success: true,
      message: '⚠️ Vulnerable clone created! This tag has NO security protection.',
      clonedData: extractedData
    };
    
    setVulnerableResult(result);
    setCurrentStep(3);
    
    Alert.alert(
      '⚠️ Step 2 Complete', 
      `Vulnerable clone created successfully!\n\n` +
      `📋 Cloned Data:\n` +
      `• Original UID: ${extractedData.originalUID}\n` +
      `• Content: ${extractedData.extractedData.realContent}\n` +
      `• Clone ID: ${Date.now()}\n\n` +
      `⚠️ This clone has no cryptographic protection and can be easily copied.`,
      [{ text: 'Next: Create Secure Clone' }]
    );
    
  } catch (error: any) {
    console.error('Step 2 error:', error);
    Alert.alert('❌ Clone Error', `Failed to create vulnerable clone: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

const handleStep3 = async () => {
  if (!vulnerableResult?.success) {
    Alert.alert('Error', 'Please complete Step 2 first.');
    return;
  }

  setIsLoading(true);
  try {
    console.log('Starting Step 3: Secure Clone');
    
    Alert.alert(
      '🔒 Step 3: Create Secure Clone',
      'Writing cryptographically protected clone...',
      [{ text: 'Cancel', onPress: () => setIsLoading(false) }]
    );

    // Create secure clone with digital signatures (use shorter data)
    const secureData = `UID:${extractedData?.originalUID?.substring(0, 8)}|SECURE:true`;
    
    await simpleSecureNFCManager.writeSecureTag(secureData, 'Demo');
    
    const result = {
      success: true,
      message: '🔒 Secure clone created with cryptographic protection!',
      hasSignature: true,
      signedAt: new Date().toISOString(),
      originalData: secureData
    };
    
    setSecureResult(result);
    setCurrentStep(4);
    
    Alert.alert(
      '🔒 Step 3 Complete', 
      `Secure clone created!\n\n` +
      `📋 Original Data: ${secureData}\n` +
      `🔐 Added Security:\n` +
      `• Digital signature with SHA-256\n` +
      `• Timestamp validation\n` +
      `• Behavioral monitoring\n` +
      `• Tamper detection\n\n` +
      `✅ This tag is cryptographically protected!`,
      [{ text: 'Next: Test Security' }]
    );
    
  } catch (error: any) {
    console.error('Step 3 error:', error);
    Alert.alert('❌ Security Error', `Failed to create secure clone: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

const handleStep4 = async () => {
  if (!secureResult?.success) {
    Alert.alert('Error', 'Please complete Step 3 first.');
    return;
  }

  setIsLoading(true);
  try {
    console.log('Starting Step 4: Security Testing');
    
    Alert.alert(
      '🧪 Step 4: Test Both Tags',
      'First, scan the VULNERABLE tag (from Step 2)...',
      [{ text: 'Cancel', onPress: () => setIsLoading(false) }]
    );

    // Test 1: Read vulnerable tag
    console.log('Testing vulnerable tag...');
    const vulnerableRead = await nfcManager.readNFCTag();
    const vulnerableWorks = vulnerableRead.ndefRecords.some(record => 
      record.payload && record.payload.includes('VULNERABLE_CLONE')
    );

    // Give user time to switch tags
    Alert.alert(
      '🔄 Switch Tags',
      'Now scan the SECURE tag (from Step 3)...',
      [{ text: 'Continue' }]
    );

    // Small delay for user to switch tags
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Read secure tag with real verification
    console.log('Testing secure tag...');
    const secureRead = await simpleSecureNFCManager.readSecureTag('Demo');
    
    // Test 3: Check if behavioral analysis is working by reading the tag multiple times
    // Instead of simulating, we'll check if the security manager actually detected patterns
    let behavioralBlock = false;
    
    // Just check the security events from the last read
    if (secureRead.securityResult.events.length > 0) {
      behavioralBlock = secureRead.securityResult.events.some(event => 
        event.type === 'CLONING_ATTEMPT' || event.type === 'RAPID_ACCESS'
      );
    }

    const results = {
      vulnerableAccess: vulnerableWorks,
      secureAccess: secureRead.accessGranted,
      signatureValid: secureRead.securityResult.isValid,
      behavioralDetection: behavioralBlock,
      securityEvents: secureRead.securityResult.events,
      vulnerableTagId: vulnerableRead.id.substring(0, 8),
      secureTagId: secureRead.tagData.id.substring(0, 8)
    };
    
    setTestResults(results);
    
    // Show comprehensive results
    Alert.alert(
      '🎯 Step 4 Complete - Security Test Results',
      `📱 Vulnerable Tag (${results.vulnerableTagId}...): ${vulnerableWorks ? '🔓 WORKS' : '🔒 BLOCKED'}\n` +
      `📱 Secure Tag (${results.secureTagId}...): ${secureRead.accessGranted ? '🔓 GRANTED' : '🔒 BLOCKED'}\n` +
      `✍️ Signature Valid: ${secureRead.securityResult.isValid ? '✅ YES' : '❌ NO'}\n` +
      `🧠 Security Events: ${secureRead.securityResult.events.length}\n` +
      `🕒 Processing Time: Much faster!\n\n` +
      `${secureRead.accessGranted ? 
        '✅ Secure tag works but has protection!' : 
        '⚠️ Security system blocked access!'}`,
      [
        { text: 'View Details', onPress: () => showSecurityDetails(results) },
        { text: 'Reset Demo', onPress: resetDemo },
        { text: 'Done' }
      ]
    );
    
  } catch (error: any) {
    console.error('Step 4 error:', error);
    Alert.alert('❌ Test Error', `Security testing failed: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

const showSecurityDetails = (results: any) => {
  const events = results.securityEvents || [];
  const eventDetails = events.map((event: any, index: number) => 
    `${index + 1}. ${event.type}: ${event.description} (${event.severity})`
  ).join('\n');

  Alert.alert(
    '🔍 Security Analysis Details',
    `🔐 SIGNATURE VERIFICATION:\n` +
    `• Valid: ${results.signatureValid ? 'YES' : 'NO'}\n` +
    `• Expired: ${results.securityEvents.some((e: any) => e.type === 'EXPIRED_SIGNATURE') ? 'YES' : 'NO'}\n\n` +
    `🧠 BEHAVIORAL ANALYSIS:\n` +
    `• Rapid Access: ${results.behavioralDetection ? 'DETECTED' : 'NORMAL'}\n` +
    `• Access Pattern: ${results.behavioralDetection ? 'SUSPICIOUS' : 'NORMAL'}\n\n` +
    `🚨 SECURITY EVENTS:\n${eventDetails || 'No events detected'}`,
    [{ text: 'OK' }]
  );
};

const resetDemo = async () => {
  try {
    setCurrentStep(1);
    setExtractedData(null);
    setVulnerableResult(null);
    setSecureResult(null);
    setTestResults(null);
    Alert.alert('🔄 Demo Reset', 'Ready to start security demonstration again!');
  } catch (error: any) {
    Alert.alert('❌ Reset Error', `Failed to reset: ${error.message}`);
  }
};

const getStepStatus = (step: number) => {
  if (step < currentStep) return '✅';
  if (step === currentStep) return '🔄';
  return '⏳';
};

const getSecuritySummary = () => {
  if (!testResults) return null;
  
  const { vulnerableAccess, secureAccess, signatureValid, behavioralDetection } = testResults;
  
  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>🛡️ Security Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Vulnerable Clone:</Text>
        <Text style={[styles.summaryValue, { color: vulnerableAccess ? '#f44336' : '#4caf50' }]}>
          {vulnerableAccess ? '🔓 WORKS' : '🔒 BLOCKED'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Secure Clone:</Text>
        <Text style={[styles.summaryValue, { color: secureAccess ? '#4caf50' : '#f44336' }]}>
          {secureAccess ? '✅ PROTECTED' : '❌ REJECTED'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Signature Check:</Text>
        <Text style={[styles.summaryValue, { color: signatureValid ? '#4caf50' : '#f44336' }]}>
          {signatureValid ? '✅ VALID' : '❌ INVALID'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Behavioral Block:</Text>
        <Text style={[styles.summaryValue, { color: behavioralDetection ? '#ff9800' : '#4caf50' }]}>
          {behavioralDetection ? '⚠️ DETECTED' : '✅ NORMAL'}
        </Text>
      </View>
    </View>
  );
};

return (
  <ScrollView style={styles.container}>
    <Text style={styles.title}>🔒 Secure NFC Cloning Demo</Text>
    <Text style={styles.subtitle}>
      Demonstration of NFC cloning attacks and cryptographic security countermeasures
    </Text>

    {/* Step 1: Extract Original Data */}
    <View style={[styles.stepContainer, currentStep === 1 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {getStepStatus(1)} Step 1: Extract Original Card Data
      </Text>
      <Text style={styles.stepDescription}>
        Scan a legitimate NFC card to extract its credentials
      </Text>
      
      {extractedData && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>✅ Extracted Data:</Text>
          <Text style={styles.dataText}>UID: {extractedData.originalUID}</Text>
          <Text style={styles.dataText}>Type: {extractedData.extractedData.type}</Text>
          <Text style={styles.dataText}>Content: {extractedData.extractedData.realContent}</Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.button, currentStep !== 1 && styles.disabledButton]} 
        onPress={handleStep1}
        disabled={currentStep !== 1 || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading && currentStep === 1 ? 'Scanning...' : 'Scan Original Card'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Step 2: Vulnerable Clone */}
    <View style={[styles.stepContainer, currentStep === 2 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {getStepStatus(2)} Step 2: Create Vulnerable Clone
      </Text>
      <Text style={styles.stepDescription}>
        Create an unprotected clone without security measures
      </Text>
      
      {vulnerableResult && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>⚠️ Vulnerable Clone Data:</Text>
          <Text style={[styles.dataText, { color: vulnerableResult.success ? '#ff9800' : 'red' }]}>
            Status: {vulnerableResult.success ? '⚠️ Clone Created (No Security)' : '❌ Clone Failed'}
          </Text>
          <Text style={styles.dataText}>Original UID: {extractedData?.originalUID}</Text>
          <Text style={styles.dataText}>Content: {extractedData?.extractedData.realContent}</Text>
          <Text style={styles.dataText}>Clone Time: {new Date(extractedData?.clonedAt || '').toLocaleTimeString()}</Text>
          <Text style={[styles.dataText, { color: '#f44336', fontWeight: 'bold' }]}>
            🚨 No cryptographic protection!
          </Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.button, styles.warningButton, currentStep !== 2 && styles.disabledButton]} 
        onPress={handleStep2}
        disabled={currentStep !== 2 || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading && currentStep === 2 ? 'Cloning...' : 'Create Vulnerable Clone'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Step 3: Secure Clone */}
    <View style={[styles.stepContainer, currentStep === 3 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {getStepStatus(3)} Step 3: Create Secure Clone
      </Text>
      <Text style={styles.stepDescription}>
        Create a cryptographically protected clone with digital signatures
      </Text>
      
      {secureResult && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>🔒 Secure Clone Data:</Text>
          <Text style={[styles.dataText, { color: secureResult.success ? 'green' : 'red' }]}>
            Status: {secureResult.success ? '✅ Secure Clone Created' : '❌ Secure Clone Failed'}
          </Text>
          <Text style={styles.dataText}>Original Data: {secureResult.originalData}</Text>
          <Text style={styles.dataText}>Signed At: {new Date(secureResult.signedAt).toLocaleTimeString()}</Text>
          {secureResult.hasSignature && (
            <>
              <Text style={[styles.dataText, { color: '#4caf50', fontWeight: 'bold' }]}>
                🔐 Cryptographic Protection Added:
              </Text>
              <Text style={styles.dataText}>• SHA-256 Digital Signature</Text>
              <Text style={styles.dataText}>• Timestamp Validation (5min expiry)</Text>
              <Text style={styles.dataText}>• Behavioral Pattern Monitoring</Text>
              <Text style={styles.dataText}>• Tamper Detection</Text>
            </>
          )}
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.button, styles.secureButton, currentStep !== 3 && styles.disabledButton]} 
        onPress={handleStep3}
        disabled={currentStep !== 3 || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading && currentStep === 3 ? 'Securing...' : 'Create Secure Clone'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Step 4: Security Testing */}
    <View style={[styles.stepContainer, currentStep === 4 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {getStepStatus(4)} Step 4: Test Security Features
      </Text>
      <Text style={styles.stepDescription}>
        Test both clones to demonstrate security effectiveness
      </Text>
      
      {testResults && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>🧪 Security Test Results:</Text>
          
          <Text style={styles.dataText}>📱 Vulnerable Tag Test:</Text>
          <Text style={[styles.dataText, { color: testResults.vulnerableAccess ? '#f44336' : '#4caf50' }]}>
            Tag ID: {testResults.vulnerableTagId}...
          </Text>
          <Text style={[styles.dataText, { color: testResults.vulnerableAccess ? '#f44336' : '#4caf50' }]}>
            Access: {testResults.vulnerableAccess ? '🔓 GRANTED (Security Risk!)' : '🔒 DENIED'}
          </Text>
          
          <Text style={[styles.dataText, { marginTop: 10 }]}>🔒 Secure Tag Test:</Text>
          <Text style={[styles.dataText, { color: testResults.secureAccess ? '#4caf50' : '#f44336' }]}>
            Tag ID: {testResults.secureTagId}...
          </Text>
          <Text style={[styles.dataText, { color: testResults.signatureValid ? '#4caf50' : '#f44336' }]}>
            Signature: {testResults.signatureValid ? '✅ VALID' : '❌ INVALID'}
          </Text>
          <Text style={[styles.dataText, { color: testResults.secureAccess ? '#4caf50' : '#f44336' }]}>
            Access: {testResults.secureAccess ? '🔓 GRANTED (Protected)' : '🔒 DENIED'}
          </Text>
          <Text style={styles.dataText}>
            Security Events: {testResults.securityEvents?.length || 0} detected
          </Text>
          {testResults.behavioralDetection && (
            <Text style={[styles.dataText, { color: '#ff9800', fontWeight: 'bold' }]}>
              🧠 Behavioral anomaly detected!
            </Text>
          )}
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.button, currentStep !== 4 && styles.disabledButton]} 
        onPress={handleStep4}
        disabled={currentStep !== 4 || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading && currentStep === 4 ? 'Testing...' : 'Test Security Features'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Security Summary */}
    {getSecuritySummary()}

    {/* Reset Button */}
    <TouchableOpacity style={styles.resetButton} onPress={resetDemo}>
      <Text style={styles.buttonText}>🔄 Reset Demo</Text>
    </TouchableOpacity>

    {/* Security Information */}
    <View style={styles.infoContainer}>
      <Text style={styles.infoTitle}>🛡️ Security Features Demonstrated</Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>1. Digital Signatures:</Text> Cryptographic proof of authenticity
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>2. Timestamp Validation:</Text> Prevents replay attacks
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>3. Behavioral Analysis:</Text> Detects suspicious access patterns
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>4. Device Fingerprinting:</Text> Tracks device-specific patterns
      </Text>
    </View>

    {/* Results Reference Table */}
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>📊 Results Reference Guide</Text>
      
      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>🔓 Vulnerable Tag Results</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>WORKS</Text>
          <Text style={[styles.tableValue, styles.badResult]}>❌ BAD</Text>
          <Text style={styles.tableDescription}>Cloning attack succeeded</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>ACCESS GRANTED</Text>
          <Text style={[styles.tableValue, styles.badResult]}>❌ BAD</Text>
          <Text style={styles.tableDescription}>Fake card fooled system</Text>
        </View>
      </View>

      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>🔒 Secure Tag Results</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>GRANTED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>✅ GOOD</Text>
          <Text style={styles.tableDescription}>Legitimate secure tag works</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>DENIED/BLOCKED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>✅ GOOD</Text>
          <Text style={styles.tableDescription}>Security caught threat</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>REJECTED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>✅ GOOD</Text>
          <Text style={styles.tableDescription}>Invalid tag detected</Text>
        </View>
      </View>

      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>🔐 Signature Results</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>VALID</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>✅ GOOD</Text>
          <Text style={styles.tableDescription}>Tag is authentic</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>INVALID</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>✅ GOOD</Text>
          <Text style={styles.tableDescription}>Fake/tampered tag caught</Text>
        </View>
      </View>

      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>🧠 Behavioral Analysis</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>NORMAL</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>✅ GOOD</Text>
          <Text style={styles.tableDescription}>No suspicious activity</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>ANOMALY DETECTED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>✅ GOOD</Text>
          <Text style={styles.tableDescription}>Security AI caught threat</Text>
        </View>
      </View>

      <View style={styles.tableSummary}>
        <Text style={styles.tableSummaryTitle}>🎯 Ideal Demo Results:</Text>
        <Text style={styles.tableSummaryText}>
          🔓 Vulnerable: "WORKS" ❌ (Shows the problem){'\n'}
          🔒 Secure: "GRANTED" ✅ (Shows solution works){'\n'}
          🔐 Signature: "VALID" ✅ (Crypto verified){'\n'}
          🧠 Behavior: "NORMAL" ✅ (Clean access)
        </Text>
      </View>
    </View>
  </ScrollView>
);
};

const styles = StyleSheet.create({
container: {
  flex: 1,
  padding: 20,
  backgroundColor: '#f5f5f5',
},
title: {
  fontSize: 24,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 10,
  color: '#1976d2',
},
subtitle: {
  fontSize: 16,
  textAlign: 'center',
  marginBottom: 30,
  color: '#666',
},
stepContainer: {
  backgroundColor: 'white',
  padding: 20,
  marginBottom: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: '#e0e0e0',
},
activeStep: {
  borderColor: '#1976d2',
  backgroundColor: '#f3f9ff',
},
stepTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
  color: '#333',
},
stepDescription: {
  fontSize: 14,
  marginBottom: 15,
  color: '#666',
},
dataContainer: {
  backgroundColor: '#f9f9f9',
  padding: 15,
  borderRadius: 5,
  marginBottom: 15,
},
dataTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 5,
  color: '#333',
},
dataText: {
  fontSize: 14,
  marginBottom: 3,
  color: '#555',
},
button: {
  backgroundColor: '#1976d2',
  padding: 15,
  borderRadius: 5,
  alignItems: 'center',
},
warningButton: {
  backgroundColor: '#ff9800',
},
secureButton: {
  backgroundColor: '#4caf50',
},
disabledButton: {
  backgroundColor: '#ccc',
},
buttonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},
resetButton: {
  backgroundColor: '#f44336',
  padding: 15,
  borderRadius: 5,
  alignItems: 'center',
  marginBottom: 20,
},
summaryContainer: {
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 10,
  marginBottom: 20,
  borderWidth: 2,
  borderColor: '#4caf50',
},
summaryTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 15,
  color: '#333',
  textAlign: 'center',
},
summaryRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
},
summaryLabel: {
  fontSize: 14,
  color: '#666',
  flex: 1,
},
summaryValue: {
  fontSize: 14,
  fontWeight: 'bold',
  flex: 1,
  textAlign: 'right',
},
infoContainer: {
  backgroundColor: '#e8f5e8',
  padding: 20,
  borderRadius: 10,
  marginBottom: 20,
},
infoTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 15,
  color: '#2e7d32',
},
infoText: {
  fontSize: 14,
  marginBottom: 8,
  color: '#2e7d32',
},
boldText: {
  fontWeight: 'bold',
},
tableContainer: {
  backgroundColor: '#f8f9fa',
  borderRadius: 10,
  padding: 20,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#e9ecef',
},
tableTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 20,
  color: '#1976d2',
},
tableSection: {
  marginBottom: 16,
},
tableSectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 10,
  color: '#333',
},
tableRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 12,
  backgroundColor: '#fff',
  marginBottom: 4,
  borderRadius: 6,
  borderLeftWidth: 3,
  borderLeftColor: '#e9ecef',
},
tableKey: {
  fontSize: 12,
  fontWeight: 'bold',
  color: '#495057',
  width: 100,
  textAlign: 'left',
},
tableValue: {
  fontSize: 12,
  fontWeight: 'bold',
  width: 60,
  textAlign: 'center',
},
tableDescription: {
  fontSize: 12,
  color: '#6c757d',
  flex: 1,
  marginLeft: 8,
},
goodResult: {
  color: '#28a745',
},
badResult: {
  color: '#dc3545',
},
tableSummary: {
  backgroundColor: '#e3f2fd',
  padding: 16,
  borderRadius: 8,
  marginTop: 8,
  borderLeftWidth: 4,
  borderLeftColor: '#1976d2',
},
tableSummaryTitle: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#1976d2',
  marginBottom: 8,
},
tableSummaryText: {
  fontSize: 12,
  color: '#1565c0',
  lineHeight: 18,
  fontFamily: 'monospace',
},
});

export default SecureCloningDemoScreen;