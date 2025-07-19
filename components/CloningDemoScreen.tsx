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
        Alert.alert('📱 NFC not available');
        return;
      }
  
      Alert.alert(
        '🚨 Step 1',
        'hold device near an NFC tag to extract data',
        [{ text: 'cancel', onPress: () => setIsLoading(false) }]
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
        'step 1 success!', 
        `EXTRACTED DATA BELOW:\n\n` +
        `UID: ${tagData.id}\n` +
        `Type: ${tagData.type || 'Unknown'}\n` +
        `Tech Types: ${tagData.techTypes.join(', ')}\n` +
        `Content: ${realContent || 'Empty tag'}\n` +
        `Records: ${tagData.ndefRecords.length}\n` +
        `Writable: ${tagData.isWritable ? 'Yes' : 'No'}`,
        [{ text: 'next step' }]
      );
      
    } catch (error: any) {
      console.error('step 1 error:', error);
      Alert.alert('❌ scan error', error.message, [{ text: 'Try Again' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStep2 = async () => {
    if (!extractedData) {
      Alert.alert('Error', 'no extracted data found');
      return;
    }
  
    setIsLoading(true);
    try {
      console.log('Starting Step 2: Clone Card');
      
      Alert.alert(
        '🚨 step 2',
        'hold your device near a BLANK tag to write cloned data',
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
        message: 'successfully cloned! blank tag now contains the OG card\'s real data.',
        clonedData: extractedData
      };
      
      setCloneResult(result);
      setCurrentStep(3);
      
      Alert.alert(
        'step 2 success!', 
        `Original UID: ${extractedData.originalUID}\n` +
        `Original Content: ${extractedData.extractedData.realContent}\n` +
        `Clone created at: ${extractedData.clonedAt}`,
        [{ text: 'Test Clone' }]
      );
      
    } catch (error: any) {
      console.error('step 2 error:', error);
      Alert.alert('error', `failed to clone: ${error.message}`);
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
        '🚨 step 3',
        'hold your device near the CLONED tag',
        [{ text: 'cancel', onPress: () => setIsLoading(false) }]
      );
  
      // Read the cloned tag
      const tagData = await nfcManager.readNFCTag();
      console.log('step 3 tag data:', tagData);
      
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
      
      console.log('step 3 - CLONED DETAILS:', fullPayload);
      
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
      
      console.log('step 3 parsed data:', {
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
          detectionMethod: isClone ? 'clone marker found in NDEF data' : 'No clone markers detected'
        }
      };
      
      setTestResult(result);
      
      // Create detailed alert message
      let alertMessage = `scanned tag ID: ${tagData.id}\n`;
      alertMessage += `clone detection: ${result.isClone ? '⚠️ CLONE DETECTED' : '✅ yes'}\n`;
      
      if (result.isClone) {
        alertMessage += `Original UID: ${originalUID}\n`;
        alertMessage += `UID Match: ${isValidClone ? '✅ YES' : '❌ NO'}\n`;
        alertMessage += `Content Match: ${hasOriginalContent ? '✅ YES' : '❌ NO'}\n`;
        alertMessage += `Clone Status: ${cloneSuccessful ? 'SUCCESS' : 'FAIL'}\n\n`;
        
        if (cloneSuccessful) {
          alertMessage += 'cloned tag contains identical data to the OG card';
        } else {
          alertMessage += 'clone detected but data doesn\'t match OG';
        }
        
        if (originalContent && originalContent !== 'EMPTY_TAG') {
          alertMessage += `\n\ncloned content: ${originalContent}`;
        }
      } else {
        alertMessage += '\nno clone markers detected';
      }
      
      Alert.alert(
        'step 3 complete - RESULTS:',
        alertMessage,
        [
          { text: 'reset', onPress: resetDemo },
          { text: 'ok' }
        ]
      );
      
    } catch (error: any) {
      console.error('step 3 error:', error);
      Alert.alert(`failed to test clone: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setExtractedData(null);
    setCloneResult(null);
    setTestResult(null);
    Alert.alert('start over available');
  };


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cloning demo!!!</Text>
      <Text style={styles.subtitle}>
        reads a real tag, writes it to a blank tag, and tests if blank tag will contain real tag's data 
        (not simulated!!!)
      </Text>

      {/* Step 1 */}
      <View style={[styles.stepContainer, currentStep === 1 && styles.activeStep]}>
        <Text style={styles.stepTitle}>step 1: extract real card data</Text>
        <Text style={styles.stepDescription}>
          read a real tag to extract its data
        </Text>
        
        {extractedData && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>DATA:</Text>
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
            {isLoading && currentStep === 1 ? 'scanning' : 'scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step 2 */}
      <View style={[styles.stepContainer, currentStep === 2 && styles.activeStep]}>
        <Text style={styles.stepTitle}>step 2: clone real data to blank tag</Text>
        <Text style={styles.stepDescription}>
          copy the real data to a blank card
        </Text>
        
        {cloneResult && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>clone result:</Text>
            <Text style={[styles.dataText, { color: cloneResult.success ? 'green' : 'red' }]}>
              {cloneResult.success ? '✅ real data cloned' : '❌ clone failed'}
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
            {isLoading && currentStep === 2 ? 'cloning in progress' : 'clone'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step 3 */}
      <View style={[styles.stepContainer, currentStep === 3 && styles.activeStep]}>
        <Text style={styles.stepTitle}>step 3: test cloned data</Text>
        <Text style={styles.stepDescription}>
          verify the cloned tag contains the OG data
        </Text>
        
        {testResult && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>RESULTS:</Text>
            <Text style={[styles.dataText, { color: testResult.isClone ? 'orange' : 'green' }]}>
              detection: {testResult.isClone ? '✅ clone detected' : 'appears legitimate'}
            </Text>
            <Text style={[styles.dataText, { color: testResult.canAccess ? 'red' : 'green' }]}>
              clone status: {testResult.canAccess ? 'SUCCESS' : 'FAIL'}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, currentStep !== 3 && styles.disabledButton]} 
          onPress={handleStep3}
          disabled={currentStep !== 3 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 3 ? 'testing' : 'test cloned data'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton} onPress={resetDemo}>
        <Text style={styles.buttonText}>reset</Text>
      </TouchableOpacity>

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