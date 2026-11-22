import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, type DimensionValue, type ViewStyle } from "react-native";
import { colors } from "@/constants/theme";

interface SkeletonBlockProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({
  width = "100%",
  height,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessible={false}
      style={[styles.block, { width, height, borderRadius, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.primaryLight },
});
