import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Animatable from 'react-native-animatable';

interface SecurityScoreProps {
  score: number;
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({ score }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const getSecurityLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: '#4CAF50' };
    if (score >= 70) return { level: 'Good', color: '#FFC107' };
    if (score >= 50) return { level: 'Fair', color: '#FF9800' };
    return { level: 'Poor', color: '#F44336' };
  };

  const securityLevel = getSecurityLevel(score);

  return (
    <Animatable.View animation="bounceIn" style={styles.scoreContainer}>
      <Animated.View 
        style={[
          styles.scoreCircle,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Text style={styles.scoreNumber}>{score}</Text>
        <Text style={styles.scorePercent}>%</Text>
      </Animated.View>
      <View style={styles.scoreInfo}>
        <Text style={[styles.securityLevel, { color: securityLevel.color }]}>
          {securityLevel.level}
        </Text>
        <Text style={styles.scoreDescription}>Security Level</Text>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  scorePercent: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: -5,
  },
  scoreInfo: {
    alignItems: 'flex-start',
  },
  securityLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  scoreDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});