// components/CloningDemoScreen.tsx - Fixed component structure
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { nfcManager } from '../lib/nfc';
import type { ClonedCardData, CloneResult } from '../lib/nfc/types.js';

const CloningDemoScreen = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [extractedData, setExtractedData] = useState<ClonedCardData | null>(null);
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        '🚨 Cloning Demo - Step 1',
        'Hold your device near an NFC tag to extract data...',
        [{ text: 'Cancel', onPress: () => setIsLoading(false) }]
      );
  
      const tagData = await nfcManager.readNFCTag();
      
      // Extract ONLY real data from the tag - no simulation
      let realContent = '';
      tagData.ndefRecords.forEach(record => {
        if (record.payload) {
          realContent += record.payload + '\n';
        }
      });
  
      // If tag is empty, show that it's empty
      if (!realContent.trim()) {
        realContent = 'EMPTY_TAG';
      }
  
      // Create extracted data using ONLY real tag data
      const extractedCardData: ClonedCardData = {
        originalUID: tagData.id,
        extractedData: {
          uid: tagData.id,
          type: tagData.type,
          techTypes: tagData.techTypes,
          records: tagData.ndefRecords,
          timestamp: tagData.timestamp,
          realContent: realContent.trim(),
          maxSize: tagData.maxSize,
          isWritable: tagData.isWritable
        },
        clonedAt: new Date().toISOString(),
      };
  
      setExtractedData(extractedCardData);
      setCurrentStep(2);
      
      Alert.alert(
        'Step 1 Complete', 
        `Real card data extracted!\n\n` +
        `UID: ${tagData.id}\n` +
        `Type: ${tagData.type || 'Unknown'}\n` +
        `Tech Types: ${tagData.techTypes.join(', ')}\n` +
        `Content: ${realContent || 'Empty tag'}\n` +
        `Records: ${tagData.ndefRecords.length}\n` +
        `Writable: ${tagData.isWritable ? 'Yes' : 'No'}`,
        [{ text: 'Next Step' }]
      );
      
    } catch (error: any) {
      console.error('Step 1 error:', error);
      Alert.alert('❌ NFC Scan Error', error.message, [{ text: 'Try Again' }]);
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
      console.log('Starting Step 2: Clone Card');
      
      Alert.alert(
        '🚨 Cloning Demo - Step 2',
        'Hold your device near a BLANK NFC tag to write the cloned data...',
        [{ text: 'Cancel', onPress: () => setIsLoading(false) }]
      );
  
      // Create clone data with ONLY the real extracted content + clone marker
      const clonedTextData = [
        `CLONE_MARKER:${Date.now()}`,
        `ORIGINAL_UID:${extractedData.originalUID}`,
        `CLONED_AT:${extractedData.clonedAt}`,
        `ORIGINAL_CONTENT:${extractedData.extractedData.realContent}`
      ];
  
      // Write the real data + clone marker to the blank tag
      await nfcManager.writeNFCTag(clonedTextData);
      
      const result: CloneResult = {
        success: true,
        message: 'Card successfully cloned! The blank tag now contains the original card\'s real data.',
        clonedData: extractedData
      };
      
      setCloneResult(result);
      setCurrentStep(3);
      
      Alert.alert(
        'Step 2 Complete', 
        `Clone successful!\n\n` +
        `Original UID: ${extractedData.originalUID}\n` +
        `Original Content: ${extractedData.extractedData.realContent}\n` +
        `Clone created at: ${extractedData.clonedAt}`,
        [{ text: 'Test Clone' }]
      );
      
    } catch (error: any) {
      console.error('Step 2 error:', error);
      Alert.alert('Error', `Failed to clone card: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStep3 = async () => {
    if (!cloneResult?.success) {
      Alert.alert('Error', 'No successful clone found. Please complete Step 2 first.');
      return;
    }
  
    setIsLoading(true);
    try {
      console.log('Starting Step 3: Test Clone');
      
      Alert.alert(
        '🚨 Cloning Demo - Step 3',
        'Hold your device near the cloned tag to test...',
        [{ text: 'Cancel', onPress: () => setIsLoading(false) }]
      );
  
      // Read the cloned tag
      const tagData = await nfcManager.readNFCTag();
      console.log('Step 3 - Tag data:', tagData);
      
      // Parse the cloned data from the payload
      let isClone = false;
      let originalUID = '';
      let originalContent = '';
      let cloneMarker = '';
      let clonedAt = '';
      
      // Combine all payloads to get the full content
      let fullPayload = '';
      tagData.ndefRecords.forEach(record => {
        if (record.payload) {
          fullPayload += record.payload + '\n';
        }
      });
      
      console.log('Step 3 - Full payload:', fullPayload);
      
      // Check if payload contains our clone marker
      if (fullPayload.includes('CLONE_MARKER:')) {
        isClone = true;
        
        // Extract real data from the payload lines
        const lines = fullPayload.split('\n');
        lines.forEach(line => {
          if (line.startsWith('ORIGINAL_UID:')) {
            originalUID = line.substring(13).trim();
          } else if (line.startsWith('CLONED_AT:')) {
            clonedAt = line.substring(10).trim();
          } else if (line.startsWith('ORIGINAL_CONTENT:')) {
            originalContent = line.substring(17).trim();
          } else if (line.startsWith('CLONE_MARKER:')) {
            cloneMarker = line.substring(13).trim();
          }
        });
      }
      
      console.log('Step 3 - Parsed data:', {
        isClone,
        originalUID,
        originalContent,
        cloneMarker,
        extractedDataUID: extractedData?.originalUID
      });
      
      // Check if this is a valid clone by comparing real data
      const isValidClone = isClone && originalUID === extractedData?.originalUID;
      const hasOriginalContent = originalContent === extractedData?.extractedData.realContent;
      
      // For this demo, we consider a clone "successful" if:
      // 1. It contains the clone marker (proves it's a clone)
      // 2. It has the correct original UID
      // 3. It contains the original content
      const cloneSuccessful = isValidClone && hasOriginalContent;
      
      const result = {
        isClone,
        canAccess: cloneSuccessful, // Clone is successful if it contains all original data
        details: {
          scannedUID: tagData.id,
          originalUID,
          originalContent,
          cloneMarker,
          isValidClone,
          hasOriginalContent,
          clonedAt,
          detectionMethod: isClone ? 'Clone marker found in NDEF data' : 'No clone markers detected'
        }
      };
      
      setTestResult(result);
      
      // Create detailed alert message
      let alertMessage = `Scanned Tag ID: ${tagData.id}\n`;
      alertMessage += `Clone Detection: ${result.isClone ? '⚠️ CLONE DETECTED' : '✅ Appears Legitimate'}\n`;
      
      if (result.isClone) {
        alertMessage += `Original UID: ${originalUID}\n`;
        alertMessage += `UID Match: ${isValidClone ? '✅ YES' : '❌ NO'}\n`;
        alertMessage += `Content Match: ${hasOriginalContent ? '✅ YES' : '❌ NO'}\n`;
        alertMessage += `Clone Status: ${cloneSuccessful ? '🔓 SUCCESSFUL CLONE' : '🔒 FAILED CLONE'}\n\n`;
        
        if (cloneSuccessful) {
          alertMessage += 'SECURITY BREACH: The cloned tag contains identical data to the original card!';
        } else {
          alertMessage += 'Clone detected but data doesn\'t match original - clone failed';
        }
        
        if (originalContent && originalContent !== 'EMPTY_TAG') {
          alertMessage += `\n\nCloned Content: ${originalContent}`;
        }
      } else {
        alertMessage += '\nNo clone markers detected - appears to be a legitimate tag';
      }
      
      Alert.alert(
        'Step 3 Complete - Clone Test Results',
        alertMessage,
        [
          { text: 'Reset Demo', onPress: resetDemo },
          { text: 'OK' }
        ]
      );
      
    } catch (error: any) {
      console.error('Step 3 error:', error);
      Alert.alert('Error', `Failed to test clone: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setExtractedData(null);
    setCloneResult(null);
    setTestResult(null);
    Alert.alert('Demo Reset', 'Ready to start over!');
  };

  // Fixed: Return the JSX directly instead of having a separate function
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚨 NFC Cloning Vulnerability Demo</Text>
      <Text style={styles.subtitle}>
        This demo shows how NFC cards can be cloned using only real tag data
      </Text>

      {/* Step 1 */}
      <View style={[styles.stepContainer, currentStep === 1 && styles.activeStep]}>
        <Text style={styles.stepTitle}>Step 1: Extract Real Card Data</Text>
        <Text style={styles.stepDescription}>
          Read a real NFC tag to extract its actual data
        </Text>
        
        {extractedData && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Real Extracted Data:</Text>
            <Text style={styles.dataText}>UID: {extractedData.originalUID}</Text>
            <Text style={styles.dataText}>Content: {extractedData.extractedData.realContent}</Text>
            <Text style={styles.dataText}>Records: {extractedData.extractedData.records.length}</Text>
            <Text style={styles.dataText}>Writable: {extractedData.extractedData.isWritable ? 'Yes' : 'No'}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, currentStep !== 1 && styles.disabledButton]} 
          onPress={handleStep1}
          disabled={currentStep !== 1 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 1 ? 'Scanning...' : 'Scan Real Card'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step 2 */}
      <View style={[styles.stepContainer, currentStep === 2 && styles.activeStep]}>
        <Text style={styles.stepTitle}>Step 2: Clone Real Data to Blank Tag</Text>
        <Text style={styles.stepDescription}>
          Write the real extracted data to a blank NFC tag
        </Text>
        
        {cloneResult && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Clone Result:</Text>
            <Text style={[styles.dataText, { color: cloneResult.success ? 'green' : 'red' }]}>
              {cloneResult.success ? '✅ Real Data Cloned' : '❌ Clone Failed'}
            </Text>
            <Text style={styles.dataText}>{cloneResult.message}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, currentStep !== 2 && styles.disabledButton]} 
          onPress={handleStep2}
          disabled={currentStep !== 2 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 2 ? 'Cloning...' : 'Clone Real Data'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step 3 */}
      <View style={[styles.stepContainer, currentStep === 3 && styles.activeStep]}>
        <Text style={styles.stepTitle}>Step 3: Test Cloned Data</Text>
        <Text style={styles.stepDescription}>
          Verify the cloned tag contains the original real data
        </Text>
        
        {testResult && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Test Results:</Text>
            <Text style={[styles.dataText, { color: testResult.isClone ? 'orange' : 'green' }]}>
              Detection: {testResult.isClone ? '⚠️ Clone Detected' : '✅ Appears Legitimate'}
            </Text>
            <Text style={[styles.dataText, { color: testResult.canAccess ? 'red' : 'green' }]}>
              Clone Status: {testResult.canAccess ? '🔓 SUCCESSFUL' : '🔒 FAILED'}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, currentStep !== 3 && styles.disabledButton]} 
          onPress={handleStep3}
          disabled={currentStep !== 3 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 3 ? 'Testing...' : 'Test Cloned Data'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton} onPress={resetDemo}>
        <Text style={styles.buttonText}>Reset Demo</Text>
      </TouchableOpacity>

      {/* Security Warning */}
      <View style={styles.warningContainer}>
        <Text style={styles.warningTitle}>⚠️ Real Data Security Risk</Text>
        <Text style={styles.warningText}>
          This demonstration uses real NFC tag data to show how:
        </Text>
        <Text style={styles.warningText}>• Any NFC tag can be read and cloned</Text>
        <Text style={styles.warningText}>• Real credentials can be duplicated</Text>
        <Text style={styles.warningText}>• Physical access cards are vulnerable</Text>
        <Text style={styles.warningText}>• No simulation - actual tag data is used</Text>
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
    color: '#d32f2f',
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
    borderColor: '#2196f3',
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
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
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
    backgroundColor: '#ff9800',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#856404',
  },
  warningText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#856404',
  },
});

export default CloningDemoScreen;