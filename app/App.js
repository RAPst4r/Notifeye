import { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import DrivingScreen from "./src/screens/DrivingScreen";
import DebugScreen from "./src/screens/DebugScreen";

export default function App() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {showDebug ? <DebugScreen /> : <DrivingScreen />}

        {/* Dev toggle — rendered last so it sits above both screens */}
        <TouchableOpacity
          style={styles.devButton}
          onPress={() => setShowDebug(v => !v)}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Text style={styles.devButtonText}>{showDebug ? 'UI' : 'DEV'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  devButton: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  devButtonText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
