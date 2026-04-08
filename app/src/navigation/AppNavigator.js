import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";

// Auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";

// Onboarding screens
import RoleSelectScreen from "../screens/onboarding/RoleSelectScreen";
import ProfileSetupScreen from "../screens/onboarding/ProfileSetupScreen";
import FamilyLinkScreen from "../screens/onboarding/FamilyLinkScreen";

// Main app screen (Phase 1 debug screen)
import DebugScreen from "../screens/DebugScreen";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: "#0a0a0a" },
  animation: "slide_from_right",
};

export default function AppNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00e5ff" />
      </View>
    );
  }

  // Determine which stack to show
  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && !profile?.role;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!isAuthenticated ? (
          // ── Auth stack ──────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : needsOnboarding ? (
          // ── Onboarding stack ────────────────────────────────────────────────
          <>
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="FamilyLink" component={FamilyLinkScreen} />
          </>
        ) : (
          // ── Main app stack ──────────────────────────────────────────────────
          <>
            <Stack.Screen name="Debug" component={DebugScreen} />
            {/* Phase 3+ screens will be added here */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
});
