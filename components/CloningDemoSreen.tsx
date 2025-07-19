// components/CloningDemoScreen.tsx 

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { nfcManager } from '../lib/nfc';
import { simpleSecureNFCManager } from '../lib/nfc/simple-secure-manager';
import { SecurityManager } from '../lib/nfc/security-manager';
import type { ClonedCardData, CloneResult } from '../lib/nfc/types';

const CloningDemoScreen = () => {
const [currentStep, setCurrentStep] = useState(1);
const [extractedData, setExtractedData] = useState<ClonedCardData | null>(null);
const [vulnerableResult, setVulnerableResult] = useState<CloneResult | null>(null);
const [secureResult, setSecureResult] = useState<any>(null);
const [testResults, setTestResults] = useState<any>(null);
const [isLoading, setIsLoading] = useState(false);

const securityManager = new SecurityManager();

const handleStep1 = async () => {
  if (isLoading) return;
  setIsLoading(true);
  
  try {
    const isAvailable = await nfcManager.isNFCAvailable();
    if (!isAvailable) {
      Alert.alert('NFC unavailable');
      return;
    }

    Alert.alert(
      'step 1: scan OG card',
      'hold card near device',
      [{ text: 'cancel', onPress: () => setIsLoading(false) }]
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
      'step 1 complete', 
      `OG card data extracted!\n\nUID: ${tagData.id}\nType: ${tagData.type}\nContent: ${realContent || 'Empty tag'}`,
      [{ text: 'next: clone without secure features' }]
    );
    
  } catch (error: any) {
    console.error('step 1 error:', error);
    Alert.alert('error', error.message, [{ text: 'try again' }]);
  } finally {
    setIsLoading(false);
  }
};

const handleStep2 = async () => {
  if (!extractedData) {
    Alert.alert('error');
    return;
  }

  setIsLoading(true);
  try {
    console.log('start step 2: vulnerable clone');
    
    Alert.alert(
      'step 2: clone without security',
      '',
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
      message: 'vulnerable clone created! tag has no protection.',
      clonedData: extractedData
    };
    
    setVulnerableResult(result);
    setCurrentStep(3);
    
    Alert.alert(
      'step 2 complete', 
      `vulnerable clone created\n\n` +
      `cloned data:\n` +
      `• original UID: ${extractedData.originalUID}\n` +
      `• content: ${extractedData.extractedData.realContent}\n` +
      `• clone ID: ${Date.now()}\n\n` +
      `clone has no cryptographic protection, can be easily copied.`,
      [{ text: 'next: create secure clone' }]
    );
    
  } catch (error: any) {
    console.error('step 2 error:', error);
    Alert.alert('clone error', `failed to create vulnerable clone: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

const handleStep3 = async () => {
  if (!vulnerableResult?.success) {
    Alert.alert('error');
    return;
  }

  setIsLoading(true);
  try {
    console.log('starting step 3: secure clone');
    
    Alert.alert(
      'step 3: create secure clone',
      'writing protected clone...',
      [{ text: 'cancel', onPress: () => setIsLoading(false) }]
    );

    // Create secure clone with digital signatures (use shorter data)
    const secureData = `UID:${extractedData?.originalUID?.substring(0, 8)}|SECURE:true`;
    
    await simpleSecureNFCManager.writeSecureTag(secureData, 'demo');
    
    const result = {
      success: true,
      message: 'secure clone created with cryptographic protection!',
      hasSignature: true,
      signedAt: new Date().toISOString(),
      originalData: secureData
    };
    
    setSecureResult(result);
    setCurrentStep(4);
    
    Alert.alert(
      'step 3 complete', 
      `secure clone created!\n\n` +
      `original data: ${secureData}\n` +
      `added security:\n` +
      `• digital signature with SHA-256\n` +
      `• timestamp validation\n` +
      `• behavioural monitoring\n` +
      `tag is cryptographically protected!`,
      [{ text: 'next: test security' }]
    );
    
  } catch (error: any) {
    console.error('step 3 error:', error);
    Alert.alert('error', `failed to create secure clone: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

const handleStep4 = async () => {
  if (!secureResult?.success) {
    Alert.alert('error');
    return;
  }

  setIsLoading(true);
  try {
    console.log('starting step 4: security test');
    
    Alert.alert(
      'step 4: test both tags',
      'scan the tag from step 2',
      [{ text: 'cancel', onPress: () => setIsLoading(false) }]
    );

    // Test 1: Read vulnerable tag
    console.log('testing vulnerable tag');
    const vulnerableRead = await nfcManager.readNFCTag();
    const vulnerableWorks = vulnerableRead.ndefRecords.some(record => 
      record.payload && record.payload.includes('VULNERABLE_CLONE')
    );

    // Give user time to switch tags
    Alert.alert(
      'switch tags',
      'scan tag from step 3 (secure one)',
      [{ text: 'continue' }]
    );

    // Small delay for user to switch tags
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Read secure tag with real verification
    console.log('testing secure tag');
    const secureRead = await simpleSecureNFCManager.readSecureTag('demo');
    
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
      'step 4 complete - test results',
      `vulnerable tag (${results.vulnerableTagId}...): ${vulnerableWorks ? 'WORKS' : 'BLOCKED'}\n` +
      `secure tag (${results.secureTagId}...): ${secureRead.accessGranted ? 'GRANTED' : 'BLOCKED'}\n` +
      `signature valid: ${secureRead.securityResult.isValid ? 'YES' : 'NO'}\n` +
      `security events: ${secureRead.securityResult.events.length}\n` +
      `${secureRead.accessGranted ? 
        'secure tag works but has protection!' : 
        'security system blocked access!'}`,
      [
        { text: 'details', onPress: () => showSecurityDetails(results) },
        { text: 'reset', onPress: resetDemo },
        { text: 'done' }
      ]
    );
    
  } catch (error: any) {
    console.error('step 4 error:', error);
    Alert.alert('error', `security testing failed: ${error.message}`);
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
    'security details',
    `signature verification:\n` +
    `valid: ${results.signatureValid ? 'YES' : 'NO'}\n` +
    `expired: ${results.securityEvents.some((e: any) => e.type === 'EXPIRED_SIGNATURE') ? 'YES' : 'NO'}\n\n` +
    `behavioural analysis:\n` +
    `rapid access: ${results.behavioralDetection ? 'DETECTED' : 'NORMAL'}\n` +
    `access pattern: ${results.behavioralDetection ? 'SUSPICIOUS' : 'NORMAL'}\n\n` +
    `events:\n${eventDetails || 'no events detected'}`,
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
    Alert.alert('reset');
  } catch (error: any) {
    Alert.alert('error', `failed to reset: ${error.message}`);
  }
};


const getSecuritySummary = () => {
  if (!testResults) return null;
  
  const { vulnerableAccess, secureAccess, signatureValid, behavioralDetection } = testResults;
  
  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>security summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>vulnerable vlone:</Text>
        <Text style={[styles.summaryValue, { color: vulnerableAccess ? '#f44336' : '#4caf50' }]}>
          {vulnerableAccess ? 'WORKS' : 'BLOCKED'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Secure Clone:</Text>
        <Text style={[styles.summaryValue, { color: secureAccess ? '#4caf50' : '#f44336' }]}>
          {secureAccess ? 'PROTECTED' : 'REJECTED'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Signature Check:</Text>
        <Text style={[styles.summaryValue, { color: signatureValid ? '#4caf50' : '#f44336' }]}>
          {signatureValid ? 'VALID' : 'INVALID'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Behavioral Block:</Text>
        <Text style={[styles.summaryValue, { color: behavioralDetection ? '#ff9800' : '#4caf50' }]}>
          {behavioralDetection ? 'DETECTED' : 'NORMAL'}
        </Text>
      </View>
    </View>
  );
};

return (
  <ScrollView style={styles.container}>
    <Text style={styles.title}>Cloning Demo</Text>
    <Text style={styles.subtitle}>
      demos an NFC cloning attack and cryptographic security countermeasures 
    </Text>

    {/* Step 1: Extract Original Data */}
    <View style={[styles.stepContainer, currentStep === 1 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {/* {getStepStatus(1)}  */}
        step 1: extract OG card data
      </Text>
      <Text style={styles.stepDescription}>
        scan a legit tag to read its info
      </Text>
      
      {extractedData && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>extracted data:</Text>
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
          {isLoading && currentStep === 1 ? 'scanning' : 'scan original card'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Step 2: Vulnerable Clone */}
    <View style={[styles.stepContainer, currentStep === 2 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {/* {getStepStatus(2)}  */}
        step 2: create vulnerable clone
      </Text>
      <Text style={styles.stepDescription}>
        create an unprotected clone without security measures
      </Text>
      
      {vulnerableResult && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>vulnerable clone data:</Text>
          <Text style={[styles.dataText, { color: vulnerableResult.success ? '#ff9800' : 'red' }]}>
            status: {vulnerableResult.success ? 'clone created (no security)' : 'clone failed'}
          </Text>
          <Text style={styles.dataText}>original UID: {extractedData?.originalUID}</Text>
          <Text style={styles.dataText}>content: {extractedData?.extractedData.realContent}</Text>
          <Text style={styles.dataText}>clone time: {new Date(extractedData?.clonedAt || '').toLocaleTimeString()}</Text>
          <Text style={[styles.dataText, { color: '#f44336', fontWeight: 'bold' }]}>
            no protection!
          </Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.button, styles.warningButton, currentStep !== 2 && styles.disabledButton]} 
        onPress={handleStep2}
        disabled={currentStep !== 2 || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading && currentStep === 2 ? 'cloning' : 'create vulnerable clone'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Step 3: Secure Clone */}
    <View style={[styles.stepContainer, currentStep === 3 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {/* {getStepStatus(3)}  */}
        step 3: create secure clone
      </Text>
      <Text style={styles.stepDescription}>
        create a cryptographically protected clone
      </Text>
      
      {secureResult && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>secure clone data:</Text>
          <Text style={[styles.dataText, { color: secureResult.success ? 'green' : 'red' }]}>
            Status: {secureResult.success ? 'secure clone created' : 'secure clone failed'}
          </Text>
          <Text style={styles.dataText}>OG data: {secureResult.originalData}</Text>
          <Text style={styles.dataText}>sign time: {new Date(secureResult.signedAt).toLocaleTimeString()}</Text>
          {secureResult.hasSignature && (
            <>
              <Text style={[styles.dataText, { color: '#4caf50', fontWeight: 'bold' }]}>
                cryptographic protection added:
              </Text>
              <Text style={styles.dataText}>• SHA-256 digital signature</Text>
              <Text style={styles.dataText}>• timestamp validation (5min expiry)</Text>
              <Text style={styles.dataText}>• behavioural pattern</Text>
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
          {isLoading && currentStep === 3 ? 'securing' : 'create secure clone'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Step 4: Security Testing */}
    <View style={[styles.stepContainer, currentStep === 4 && styles.activeStep]}>
      <Text style={styles.stepTitle}>
        {/* {getStepStatus(4)}  */}
        step 4: test security
      </Text>
      <Text style={styles.stepDescription}>
        test both clones
      </Text>
      
      {testResults && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>security test results:</Text>
          
          <Text style={styles.dataText}>vulnerable tag:</Text>
          <Text style={[styles.dataText, { color: testResults.vulnerableAccess ? '#f44336' : '#4caf50' }]}>
            tag ID: {testResults.vulnerableTagId}...
          </Text>
          <Text style={[styles.dataText, { color: testResults.vulnerableAccess ? '#f44336' : '#4caf50' }]}>
            access: {testResults.vulnerableAccess ? 'GRANTED (Security Risk!)' : 'DENIED'}
          </Text>
          
          <Text style={[styles.dataText, { marginTop: 10 }]}>🔒 Secure Tag Test:</Text>
          <Text style={[styles.dataText, { color: testResults.secureAccess ? '#4caf50' : '#f44336' }]}>
            tag ID: {testResults.secureTagId}...
          </Text>
          <Text style={[styles.dataText, { color: testResults.signatureValid ? '#4caf50' : '#f44336' }]}>
            signature: {testResults.signatureValid ? 'VALID' : 'INVALID'}
          </Text>
          <Text style={[styles.dataText, { color: testResults.secureAccess ? '#4caf50' : '#f44336' }]}>
            access: {testResults.secureAccess ? 'GRANTED (Protected)' : 'DENIED'}
          </Text>
          <Text style={styles.dataText}>
            security events: {testResults.securityEvents?.length || 0} detected
          </Text>
          {testResults.behavioralDetection && (
            <Text style={[styles.dataText, { color: '#ff9800', fontWeight: 'bold' }]}>
              behavioural anomaly detected
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
          {isLoading && currentStep === 4 ? 'testing' : 'test security features'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Security Summary */}
    {getSecuritySummary()}

    {/* Reset Button */}
    <TouchableOpacity style={styles.resetButton} onPress={resetDemo}>
      <Text style={styles.buttonText}>🔄 reset</Text>
    </TouchableOpacity>

    {/* Security Information */}
    <View style={styles.infoContainer}>
      <Text style={styles.infoTitle}>security featueres shown</Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>1. digital signature:</Text> proof of authenticity
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>2. timestamp valididty:</Text> prevents replay attacks
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.boldText}>3. behavioural analysis:</Text> detects suspicious access patterns
      </Text>
    </View>

    {/* Results Reference Table */}
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>uide</Text>
      
      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>vulnerable tag</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>WORKS</Text>
          <Text style={[styles.tableValue, styles.badResult]}>BAD</Text>
          <Text style={styles.tableDescription}>cloning attack successful</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>ACCESS GRANTED</Text>
          <Text style={[styles.tableValue, styles.badResult]}>BAD</Text>
          <Text style={styles.tableDescription}>fake card fooled system</Text>
        </View>
      </View>

      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>secure tag</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>GRANTED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>GOOD</Text>
          <Text style={styles.tableDescription}>legit secure tag works</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>DENIED/BLOCKED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>GOOD</Text>
          <Text style={styles.tableDescription}>security caught threat</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>REJECTED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>GOOD</Text>
          <Text style={styles.tableDescription}>invalid tag detected</Text>
        </View>
      </View>

      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>Signature</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>VALID</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>GOOD</Text>
          <Text style={styles.tableDescription}>tag is authentic</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>INVALID</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>GOOD</Text>
          <Text style={styles.tableDescription}>fake tag caught</Text>
        </View>
      </View>

      <View style={styles.tableSection}>
        <Text style={styles.tableSectionTitle}>behavioural analysis</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>NORMAL</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>GOOD</Text>
          <Text style={styles.tableDescription}>no suspicious activity</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableKey}>ANOMALY DETECTED</Text>
          <Text style={[styles.tableValue, styles.goodResult]}>GOOD</Text>
          <Text style={styles.tableDescription}>security caught threat</Text>
        </View>
      </View>

      <View style={styles.tableSummary}>
        <Text style={styles.tableSummaryTitle}>ideal results:</Text>
        <Text style={styles.tableSummaryText}>
          vulnerable: "WORKS"{'\n'}
          secure: "GRANTED"{'\n'}
          signature: "VALID"{'\n'}
          behavior: "NORMAL"
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

export default CloningDemoScreen;