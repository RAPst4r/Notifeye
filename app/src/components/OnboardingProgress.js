import { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

const TOTAL_STEPS = 13;

export default function OnboardingProgress({ step }) {
  const width = useRef(new Animated.Value((step - 1) / TOTAL_STEPS)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: step / TOTAL_STEPS,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: "#0F1623",
    borderRadius: 2,
    marginBottom: 28,
    overflow: "hidden",
  },
  fill: {
    height: 3,
    backgroundColor: Colors.brandBlue,
    borderRadius: 2,
  },
});
