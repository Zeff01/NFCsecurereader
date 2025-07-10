import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

interface SecurityFeature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
  critical: boolean;
}

interface SecurityFeatureCardProps {
  feature: SecurityFeature;
  index: number;
  onToggle: (featureId: string, enabled: boolean) => void;
}

export const SecurityFeatureCard: React.FC<SecurityFeatureCardProps> = ({
  feature,
  index,
  onToggle,
}) => {
  return (
    <Animatable.View
      animation="fadeInRight"
      delay={index * 100}
      style={styles.featureCard}
    >
      <View style={styles.featureHeader}>
        <View style={styles.featureIcon}>
          <Ionicons
            name={feature.icon}
            size={24}
            color={feature.enabled ? '#4CAF50' : '#666'}
          />
        </View>
        <View style={styles.featureInfo}>
          <View style={styles.featureTitleRow}>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            {feature.critical && (
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalText}>Critical</Text>
              </View>
            )}
          </View>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
        <Switch
          value={feature.enabled}
          onValueChange={(enabled) => onToggle(feature.id, enabled)}
          trackColor={{ false: '#ccc', true: '#4CAF50' }}
          thumbColor={feature.enabled ? '#fff' : '#f4f3f4'}
        />
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  criticalBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  criticalText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});