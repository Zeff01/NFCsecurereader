import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface FloatingParticleProps {
  delay: number;
  left?: string;
  top?: string;
}

const FloatingParticle: React.FC<FloatingParticleProps> = ({ 
  delay, 
  left = '10%', 
  top = '20%' 
}) => {
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateYAnim, {
            toValue: -30,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 30,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const timer = setTimeout(createAnimation, delay);
    return () => clearTimeout(timer);
  }, [translateYAnim, opacityAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left,
          top,
          transform: [{ translateY: translateYAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

export const FloatingParticles: React.FC = () => {
  return (
    <>
      <FloatingParticle delay={0} left="10%" top="20%" />
      <FloatingParticle delay={1000} left="85%" top="30%" />
      <FloatingParticle delay={2000} left="15%" top="70%" />
      <FloatingParticle delay={1500} left="80%" top="60%" />
      <FloatingParticle delay={500} left="50%" top="15%" />
    </>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});