import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

import { nfcManager, NFCAccessLog, ThreatReport } from '@/lib/nfc-manager';

// Tab Button Component
const TabButton: React.FC<{
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}> = ({ title, icon, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={20} color={active ? '#fff' : '#666'} />
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
      {title}
    </Text>
  </TouchableOpacity>
);

// Log Item Component
const LogItem: React.FC<{
  log: NFCAccessLog;
  onPress: () => void;
}> = ({ log, onPress }) => (
  <TouchableOpacity style={styles.logItem} onPress={onPress}>
    <View style={styles.logHeader}>
      <View style={styles.logIconContainer}>
        <Ionicons name="radio" size={20} color="#667eea" />
      </View>
      <View style={styles.logInfo}>
        <Text style={styles.logTitle}>NFC Tag Read</Text>
        <Text style={styles.logTime}>
          {new Date(log.timestamp).toLocaleString()}
        </Text>
      </View>
      <View style={[styles.securityBadge, styles[`security${log.securityLevel}`]]}>
        <Text style={styles.securityBadgeText}>{log.securityLevel}</Text>
      </View>
    </View>
    <View style={styles.logDetails}>
      <Text style={styles.logDetail}>Tag ID: {log.tagId.substring(0, 12)}...</Text>
      <Text style={styles.logDetail}>Duration: {log.readDuration}ms</Text>
      <Text style={styles.logDetail}>
        Threat: {log.threatDetected ? '⚠️ Detected' : '✅ Clean'}
      </Text>
    </View>
  </TouchableOpacity>
);

// Threat Item Component
const ThreatItem: React.FC<{
  threat: ThreatReport;
  onPress: () => void;
}> = ({ threat, onPress }) => (
  <TouchableOpacity style={styles.threatItem} onPress={onPress}>
    <View style={styles.threatHeader}>
      <View style={[styles.threatIconContainer, styles[`threat${threat.severity}`]]}>
        <Ionicons 
          name={threat.blocked ? 'shield-checkmark' : 'warning'} 
          size={20} 
          color="#fff" 
        />
      </View>
      <View style={styles.threatInfo}>
        <Text style={styles.threatTitle}>{threat.threatType.replace('_', ' ')}</Text>
        <Text style={styles.threatTime}>
          {new Date(threat.timestamp).toLocaleString()}
        </Text>
      </View>
      <View style={styles.threatStatus}>
        <Text style={[
          styles.threatStatusText,
          threat.blocked ? styles.threatBlocked : styles.threatAllowed
        ]}>
          {threat.blocked ? 'BLOCKED' : 'MONITORED'}
        </Text>
      </View>
    </View>
    <Text style={styles.threatDescription}>{threat.description}</Text>
  </TouchableOpacity>
);

// Stats Display Component
const StatsDisplay: React.FC<{
  activeTab: 'access' | 'threats';
  accessLogs: NFCAccessLog[];
  threatReports: ThreatReport[];
}> = ({ activeTab, accessLogs, threatReports }) => {
  const getStatsData = () => {
    if (activeTab === 'access') {
      const totalReads = accessLogs.length;
      const threatsDetected = accessLogs.filter(log => log.threatDetected).length;
      const avgDuration = accessLogs.length > 0 
        ? Math.round(accessLogs.reduce((sum, log) => sum + log.readDuration, 0) / accessLogs.length)
        : 0;
      
      return {
        total: totalReads,
        threats: threatsDetected,
        avgDuration,
        securityScore: totalReads > 0 ? Math.round(((totalReads - threatsDetected) / totalReads) * 100) : 100
      };
    } else {
      const totalThreats = threatReports.length;
      const blockedThreats = threatReports.filter(threat => threat.blocked).length;
      const highSeverity = threatReports.filter(threat => threat.severity === 'HIGH').length;
      
      return {
        total: totalThreats,
        blocked: blockedThreats,
        highSeverity,
        blockRate: totalThreats > 0 ? Math.round((blockedThreats / totalThreats) * 100) : 0
      };
    }
  };

  const stats = getStatsData();

  return (
    <View style={styles.statsContainer}>
      {activeTab === 'access' ? (
        <>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Reads</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.threats}</Text>
            <Text style={styles.statLabel}>Threats</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.avgDuration}ms</Text>
            <Text style={styles.statLabel}>Avg Duration</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.securityScore}%</Text>
            <Text style={styles.statLabel}>Security Score</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Threats</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.blocked}</Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.highSeverity}</Text>
            <Text style={styles.statLabel}>High Severity</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.blockRate}%</Text>
            <Text style={styles.statLabel}>Block Rate</Text>
          </View>
        </>
      )}
    </View>
  );
};

// Empty State Component
const EmptyState: React.FC<{
  activeTab: 'access' | 'threats';
}> = ({ activeTab }) => (
  <View style={styles.emptyState}>
    <Ionicons 
      name={activeTab === 'access' ? 'document-text-outline' : 'shield-checkmark-outline'} 
      size={64} 
      color={activeTab === 'access' ? '#ccc' : '#4CAF50'} 
    />
    <Text style={styles.emptyTitle}>
      {activeTab === 'access' ? 'No Access Logs' : 'No Threats Detected'}
    </Text>
    <Text style={styles.emptyDescription}>
      {activeTab === 'access' 
        ? 'NFC access logs will appear here when you start reading tags'
        : 'Your system is secure. Threat reports will appear here if any are detected.'
      }
    </Text>
  </View>
);

export default function LogsScreen() {
  const [activeTab, setActiveTab] = useState<'access' | 'threats'>('access');
  const [accessLogs, setAccessLogs] = useState<NFCAccessLog[]>([]);
  const [threatReports, setThreatReports] = useState<ThreatReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<NFCAccessLog | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<ThreatReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const [logs, threats] = await Promise.all([
        nfcManager.getAccessLogs(),
        nfcManager.getThreatReports(),
      ]);
      setAccessLogs(logs);
      setThreatReports(threats);
    } catch (error) {
      console.warn('Failed to load logs:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      `Are you sure you want to clear all ${activeTab === 'access' ? 'access logs' : 'threat reports'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeTab === 'access') {
                await nfcManager.clearAccessLogs();
                setAccessLogs([]);
              } else {
                await nfcManager.clearThreatReports();
                setThreatReports([]);
              }
              Alert.alert('Success', 'Logs cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear logs');
            }
          },
        },
      ]
    );
  };

  const handleLogPress = (log: NFCAccessLog) => {
    setSelectedLog(log);
    setSelectedThreat(null);
    setShowDetailModal(true);
  };

  const handleThreatPress = (threat: ThreatReport) => {
    setSelectedThreat(threat);
    setSelectedLog(null);
    setShowDetailModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#a8edea', '#fed6e3']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Security Logs</Text>
        <Text style={styles.headerSubtitle}>Monitor & Analyze Activity</Text>
        
        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TabButton
            title="Access Logs"
            icon="list"
            active={activeTab === 'access'}
            onPress={() => setActiveTab('access')}
          />
          <TabButton
            title="Threats"
            icon="warning"
            active={activeTab === 'threats'}
            onPress={() => setActiveTab('threats')}
          />
        </View>

        {/* Stats */}
        <StatsDisplay 
          activeTab={activeTab}
          accessLogs={accessLogs}
          threatReports={threatReports}
        />
      </LinearGradient>

      <View style={styles.content}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color="#667eea" />
            <Text style={styles.actionButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleClearLogs}>
            <Ionicons name="trash" size={20} color="#F44336" />
            <Text style={[styles.actionButtonText, { color: '#F44336' }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Logs List */}
        <ScrollView
          style={styles.logsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'access' ? (
            accessLogs.length > 0 ? (
              accessLogs.map((log, index) => (
                <Animatable.View key={`${log.tagId}-${log.timestamp}`} animation="fadeInUp" delay={index * 50}>
                  <LogItem log={log} onPress={() => handleLogPress(log)} />
                </Animatable.View>
              ))
            ) : (
              <EmptyState activeTab={activeTab} />
            )
          ) : (
            threatReports.length > 0 ? (
              threatReports.map((threat, index) => (
                <Animatable.View key={threat.id} animation="fadeInUp" delay={index * 50}>
                  <ThreatItem threat={threat} onPress={() => handleThreatPress(threat)} />
                </Animatable.View>
              ))
            ) : (
              <EmptyState activeTab={activeTab} />
            )
          )}
        </ScrollView>
      </View>

      {/* Detail Modal */}
      <DetailModal
        visible={showDetailModal}
        selectedLog={selectedLog}
        selectedThreat={selectedThreat}
        onClose={() => setShowDetailModal(false)}
      />
    </SafeAreaView>
  );
}

// Detail Modal Component
const DetailModal: React.FC<{
  visible: boolean;
  selectedLog: NFCAccessLog | null;
  selectedThreat: ThreatReport | null;
  onClose: () => void;
}> = ({ visible, selectedLog, selectedThreat, onClose }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {selectedLog ? 'Access Log Details' : 'Threat Report Details'}
          </Text>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {selectedLog && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>NFC Access Log</Text>
              <DetailRow label="Tag ID" value={selectedLog.tagId} />
              <DetailRow label="Timestamp" value={new Date(selectedLog.timestamp).toLocaleString()} />
              <DetailRow label="Technologies" value={selectedLog.techTypes.join(', ')} />
              <DetailRow label="Read Duration" value={`${selectedLog.readDuration}ms`} />
              <DetailRow label="NDEF Data" value={selectedLog.hasNdefData ? 'Present' : 'None'} />
              <DetailRow 
                label="Security Level" 
                value={selectedLog.securityLevel}
                valueStyle={styles[`security${selectedLog.securityLevel}`]}
              />
              <DetailRow 
                label="Threat Detected" 
                value={selectedLog.threatDetected ? 'Yes' : 'No'}
                valueStyle={selectedLog.threatDetected ? styles.threatDetected : styles.threatClean}
              />
            </View>
          )}

          {selectedThreat && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Threat Report</Text>
              <DetailRow label="Threat Type" value={selectedThreat.threatType.replace('_', ' ')} />
              <DetailRow 
                label="Severity" 
                value={selectedThreat.severity}
                valueStyle={styles[`threat${selectedThreat.severity}`]}
              />
              <DetailRow 
                label="Status" 
                value={selectedThreat.blocked ? 'BLOCKED' : 'MONITORED'}
                valueStyle={selectedThreat.blocked ? styles.threatBlocked : styles.threatAllowed}
              />
              <DetailRow label="Timestamp" value={new Date(selectedThreat.timestamp).toLocaleString()} />
              {selectedThreat.tagId && (
                <DetailRow label="Tag ID" value={selectedThreat.tagId} />
              )}
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailDescription}>{selectedThreat.description}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Detail Row Component
const DetailRow: React.FC<{
  label: string;
  value: string;
  valueStyle?: any;
}> = ({ label, value, valueStyle }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
  </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 6,
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#666',
  },
  securityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  securityHIGH: {
    backgroundColor: '#4CAF50',
  },
  securityMEDIUM: {
    backgroundColor: '#FFC107',
  },
  securityLOW: {
    backgroundColor: '#F44336',
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  logDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  threatItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  threatIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threatHIGH: {
    backgroundColor: '#F44336',
  },
  threatMEDIUM: {
    backgroundColor: '#FF9800',
  },
  threatLOW: {
    backgroundColor: '#FFC107',
  },
  threatInfo: {
    flex: 1,
  },
  threatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  threatTime: {
    fontSize: 12,
    color: '#666',
  },
  threatStatus: {
    alignItems: 'flex-end',
  },
  threatStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  threatBlocked: {
    backgroundColor: '#F44336',
    color: '#fff',
  },
  threatAllowed: {
    backgroundColor: '#FFC107',
    color: '#333',
  },
  threatDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailColumn: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  detailDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginTop: 8,
  },
  threatDetected: {
    color: '#F44336',
  },
  threatClean: {
    color: '#4CAF50',
  },
});