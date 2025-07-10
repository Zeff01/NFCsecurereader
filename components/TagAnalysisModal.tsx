import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { NFCTagData, nfcManager } from '@/lib/nfc-manager';

interface TagAnalysisModalProps {
  visible: boolean;
  tagData: NFCTagData | null;
  onClose: () => void;
}

export const TagAnalysisModal: React.FC<TagAnalysisModalProps> = ({
  visible,
  tagData,
  onClose,
}) => {
  const [isProtecting, setIsProtecting] = useState(false);
  const [protectionStatus, setProtectionStatus] = useState<{
    readProtection: boolean;
    writeProtection: boolean;
    cloningProtection: boolean;
    backupCreated: boolean;
  }>({
    readProtection: false,
    writeProtection: false,
    cloningProtection: false,
    backupCreated: false,
  });

  if (!tagData) return null;

  const getThreatLevel = () => {
    if (!tagData.isWritable) return { level: 'LOW', color: '#4CAF50', text: 'Read-Only Tag' };
    if (tagData.ndefRecords.length === 0) return { level: 'MEDIUM', color: '#FFC107', text: 'Empty Tag' };
    return { level: 'HIGH', color: '#F44336', text: 'Writable with Data' };
  };

  const threat = getThreatLevel();

  const handleEnableReadProtection = async () => {
    setIsProtecting(true);
    try {
      await nfcManager.enableReadProtection();
      setProtectionStatus(prev => ({ ...prev, readProtection: true }));
      Alert.alert('✅ Success', 'Read protection enabled! Unauthorized access attempts will be blocked.');
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to enable read protection');
    } finally {
      setIsProtecting(false);
    }
  };

  const handleEnableWriteProtection = async () => {
    if (!tagData.isWritable) {
      Alert.alert('ℹ️ Info', 'This tag is already read-only');
      return;
    }

    Alert.alert(
      '⚠️ Confirm Write Protection',
      'This will make the tag permanently read-only. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable Protection',
          style: 'destructive',
          onPress: async () => {
            setIsProtecting(true);
            try {
              await nfcManager.enableWriteProtection();
              setProtectionStatus(prev => ({ ...prev, writeProtection: true }));
              Alert.alert('✅ Success', 'Write protection enabled! Tag is now read-only.');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to enable write protection');
            } finally {
              setIsProtecting(false);
            }
          }
        }
      ]
    );
  };

  const handleEnableCloningProtection = async () => {
    setIsProtecting(true);
    try {
      await nfcManager.enableCloningProtection();
      setProtectionStatus(prev => ({ ...prev, cloningProtection: true }));
      Alert.alert('✅ Success', 'Cloning protection enabled! Tag cloning attempts will be detected.');
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to enable cloning protection');
    } finally {
      setIsProtecting(false);
    }
  };

  const handleCreateSecureBackup = async () => {
    setIsProtecting(true);
    try {
      const backup = await nfcManager.generateSecureBackup(tagData);
      setProtectionStatus(prev => ({ ...prev, backupCreated: true }));
      Alert.alert(
        '✅ Backup Created',
        'Secure encrypted backup of tag data has been created and stored locally.',
        [
          { text: 'OK' },
          { text: 'View Backup', onPress: () => console.log('Show backup:', backup) }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to create backup');
    } finally {
      setIsProtecting(false);
    }
  };

  const protectionActions = [
    {
      id: 'read',
      title: 'Enable Read Protection',
      description: 'Prevent unauthorized reading of tag data',
      icon: 'eye-off' as const,
      color: '#4facfe',
      enabled: !protectionStatus.readProtection,
      action: handleEnableReadProtection,
    },
    {
      id: 'write',
      title: 'Enable Write Protection',
      description: 'Make tag permanently read-only',
      icon: 'lock-closed' as const,
      color: '#fa709a',
      enabled: tagData.isWritable && !protectionStatus.writeProtection,
      action: handleEnableWriteProtection,
    },
    {
      id: 'cloning',
      title: 'Enable Cloning Protection',
      description: 'Detect and prevent tag cloning attempts',
      icon: 'shield-checkmark' as const,
      color: '#667eea',
      enabled: !protectionStatus.cloningProtection,
      action: handleEnableCloningProtection,
    },
    {
      id: 'backup',
      title: 'Create Secure Backup',
      description: 'Generate encrypted backup of tag data',
      icon: 'cloud-upload' as const,
      color: '#4CAF50',
      enabled: !protectionStatus.backupCreated,
      action: handleCreateSecureBackup,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NFC Tag Analysis</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Threat Assessment */}
          <Animatable.View animation="fadeInUp" style={styles.threatCard}>
            <View style={styles.threatHeader}>
              <Ionicons name="warning" size={24} color={threat.color} />
              <Text style={styles.threatTitle}>Security Assessment</Text>
            </View>
            <View style={[styles.threatBadge, { backgroundColor: threat.color }]}>
              <Text style={styles.threatBadgeText}>{threat.level} RISK</Text>
            </View>
            <Text style={styles.threatDescription}>{threat.text}</Text>
          </Animatable.View>

          {/* Tag Information */}
          <Animatable.View animation="fadeInUp" delay={200} style={styles.infoCard}>
            <Text style={styles.cardTitle}>📱 Tag Information</Text>
            <View style={styles.infoGrid}>
              <InfoItem label="Tag ID" value={tagData.id} />
              <InfoItem label="Type" value={tagData.type || 'Unknown'} />
              <InfoItem label="Size" value={`${tagData.maxSize || 0} bytes`} />
              <InfoItem label="Writable" value={tagData.isWritable ? 'Yes' : 'No'} />
              <InfoItem label="Technologies" value={tagData.techTypes.join(', ')} />
              <InfoItem label="NDEF Records" value={tagData.ndefRecords.length.toString()} />
            </View>
          </Animatable.View>

          {/* NDEF Data */}
          {tagData.ndefRecords.length > 0 && (
            <Animatable.View animation="fadeInUp" delay={400} style={styles.infoCard}>
              <Text style={styles.cardTitle}>📄 NDEF Records</Text>
              {tagData.ndefRecords.map((record, index) => (
                <View key={index} style={styles.recordCard}>
                  <Text style={styles.recordTitle}>Record {index + 1}</Text>
                  <Text style={styles.recordType}>Type: {record.type || 'Unknown'}</Text>
                  {record.payload?.type === 'text' && (
                    <Text style={styles.recordContent}>Text: "{record.payload.text}"</Text>
                  )}
                  {record.payload?.type === 'uri' && (
                    <Text style={styles.recordContent}>URI: {record.payload.uri}</Text>
                  )}
                </View>
              ))}
            </Animatable.View>
          )}

          {/* Protection Actions */}
          <Animatable.View animation="fadeInUp" delay={600} style={styles.actionsCard}>
            <Text style={styles.cardTitle}>🛡️ Protection Actions</Text>
            <Text style={styles.actionsSubtitle}>
              Select protection measures to secure this NFC tag
            </Text>
            
            {protectionActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  !action.enabled && styles.actionButtonDisabled
                ]}
                onPress={action.action}
                disabled={!action.enabled || isProtecting}
              >
                <LinearGradient
                  colors={action.enabled ? [action.color, `${action.color}CC`] : ['#ccc', '#aaa']}
                  style={styles.actionGradient}
                >
                  <View style={styles.actionContent}>
                    <View style={styles.actionIcon}>
                      <Ionicons 
                        name={action.enabled ? action.icon : 'checkmark-circle'} 
                        size={24} 
                        color="#fff" 
                      />
                    </View>
                    <View style={styles.actionText}>
                      <Text style={styles.actionTitle}>
                        {action.enabled ? action.title : `${action.title} ✓`}
                      </Text>
                      <Text style={styles.actionDescription}>
                        {action.enabled ? action.description : 'Protection enabled'}
                      </Text>
                    </View>
                    {isProtecting && (
                      <ActivityIndicator color="#fff" size="small" />
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </Animatable.View>

          {/* Quick Actions */}
          <Animatable.View animation="fadeInUp" delay={800} style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => {
                Alert.alert('🔄 Rescan', 'Place the tag near your device to scan again');
                onClose();
              }}
            >
              <Ionicons name="refresh" size={20} color="#667eea" />
              <Text style={styles.quickActionText}>Rescan Tag</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => {
                Alert.alert('📋 Export', 'Tag data will be exported to a secure format');
              }}
            >
              <Ionicons name="share" size={20} color="#667eea" />
              <Text style={styles.quickActionText}>Export Data</Text>
            </TouchableOpacity>
          </Animatable.View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  threatCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  threatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  threatBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  threatBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  threatDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
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
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  recordCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  recordType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  recordContent: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  actionsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  actionsSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionGradient: {
    padding: 16,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});