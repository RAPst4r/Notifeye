import "react-native-gesture-handler"; // must be first import
import { useState } from "react";
import { TouchableWithoutFeedback, Keyboard, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/context/AuthContext";

// ── Onboarding screens ────────────────────────────────────────────────────────
import AgeScreen from "./src/screens/onboarding/AgeScreen";
import NameEntryScreen from "./src/screens/onboarding/NameEntryScreen";
import AuthMethodScreen from "./src/screens/onboarding/AuthMethodScreen";
import PhoneEntryScreen from "./src/screens/onboarding/PhoneEntryScreen";
import PhoneVerifyScreen from "./src/screens/onboarding/PhoneVerifyScreen";
import PasswordCreateScreen from "./src/screens/onboarding/PasswordCreateScreen";
import CircleSetupScreen from "./src/screens/onboarding/CircleSetupScreen";
import EmergencyBuddyScreen from "./src/screens/onboarding/EmergencyBuddyScreen";
import PermissionsScreen from "./src/screens/onboarding/PermissionsScreen";
import CameraCalibrationScreen from "./src/screens/onboarding/CameraCalibrationScreen";
import PlanSelectScreen from "./src/screens/onboarding/PlanSelectScreen";
import TermsAcceptScreen from "./src/screens/onboarding/TermsAcceptScreen";
import HeadCalibrationScreen from "./src/screens/onboarding/HeadCalibrationScreen";
import WelcomeScreen from "./src/screens/onboarding/WelcomeScreen";
import MainTabs from "./src/navigation/MainTabs";

import AppNavigator from "./src/navigation/AppNavigator";
import DebugScreen from "./src/screens/DebugScreen";

const Stack = createNativeStackNavigator();
const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: "#030B11" },
  animation: "slide_from_right",
};

function RootKeyboardDismiss({ children }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

// ── DEV: walks all 13 onboarding steps in order ───────────────────────────────
function OnboardingTestApp() {
  return (
    <RootKeyboardDismiss>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={screenOptions}>
              <Stack.Screen name="NameEntry" component={NameEntryScreen} />
              <Stack.Screen name="AgeEntry" component={AgeScreen} />
              <Stack.Screen name="AuthEntry" component={AuthMethodScreen} />
              <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
              <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} />
              <Stack.Screen name="PasswordCreate" component={PasswordCreateScreen} />
              <Stack.Screen name="CircleSetup" component={CircleSetupScreen} />
              <Stack.Screen name="EmergencyBuddy" component={EmergencyBuddyScreen} />
              <Stack.Screen name="Permissions" component={PermissionsScreen} />
              <Stack.Screen name="CameraCalibration" component={CameraCalibrationScreen} />
              <Stack.Screen name="PlanSelect" component={PlanSelectScreen} />
              <Stack.Screen name="TermsAccept"     component={TermsAcceptScreen} />
              <Stack.Screen name="HeadCalibration" component={HeadCalibrationScreen} />
              <Stack.Screen name="Welcome"          component={WelcomeScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </RootKeyboardDismiss>
  );
}

// ── Production app ────────────────────────────────────────────────────────────
function ProductionApp() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <RootKeyboardDismiss>
      <SafeAreaProvider>
        <AuthProvider>
          <View style={styles.root}>
            {showDebug ? <DebugScreen /> : <AppNavigator />}

            <TouchableOpacity
              style={styles.devButton}
              onPress={() => setShowDebug(v => !v)}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <Text style={styles.devButtonText}>{showDebug ? 'UI' : 'DEV'}</Text>
            </TouchableOpacity>
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </RootKeyboardDismiss>
  );
}

// ── Swap this line when done testing ─────────────────────────────────────────
// export default OnboardingTestApp;
export default ProductionApp;

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