import {} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";

// Auth screens
import LoginScreen  from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";

// Onboarding screens
import RoleSelectScreen        from "../screens/onboarding/RoleSelectScreen";
import AuthMethodScreen        from "../screens/onboarding/AuthMethodScreen";
import EmailEntryScreen        from "../screens/onboarding/EmailEntryScreen";
import PasswordCreateScreen    from "../screens/onboarding/PasswordCreateScreen";
import NameEntryScreen         from "../screens/onboarding/NameEntryScreen";
import PhoneEntryScreen        from "../screens/onboarding/PhoneEntryScreen";
import PhoneVerifyScreen       from "../screens/onboarding/PhoneVerifyScreen";
import PermissionsScreen       from "../screens/onboarding/PermissionsScreen";
import CircleSetupScreen       from "../screens/onboarding/CircleSetupScreen";
import EmergencyBuddyScreen    from "../screens/onboarding/EmergencyBuddyScreen";
import CameraCalibrationScreen from "../screens/onboarding/CameraCalibrationScreen";
import PlanSelectScreen        from "../screens/onboarding/PlanSelectScreen";
import TermsAcceptScreen       from "../screens/onboarding/TermsAcceptScreen";
import WelcomeScreen           from "../screens/onboarding/WelcomeScreen";

// Main app
import DebugScreen  from "../screens/DebugScreen";
import SplashScreen from "../screens/SplashScreen";
import MainTabs     from "./MainTabs";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: "#030B11" },
  animation: "slide_from_right",
};

// Map onboardingStep → screen name for drop-off recovery
// Steps 1-6 are pre-auth — user can't be authed without completing them
const RESUME_SCREEN = {
  7:  "CircleSetup",
  8:  "EmergencyBuddy",
  9:  "Permissions",
  10: "CameraCalibration",
  11: "PlanSelect",
  12: "TermsAccept",
  13: "Welcome",
};

export default function AppNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  const isAuthenticated  = !!user;
  const needsOnboarding  = isAuthenticated && !profile?.onboardingComplete;

  // Drop-off recovery: resume at the step they were on
  const resumeScreen = needsOnboarding
    ? (RESUME_SCREEN[profile?.onboardingStep] ?? "CircleSetup")
    : null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!isAuthenticated ? (
          // ── Auth stack ────────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Login"   component={LoginScreen} />
            <Stack.Screen name="SignUp"  component={SignUpScreen} />
            {/* Pre-auth onboarding (role select + account creation) */}
            <Stack.Screen name="RoleSelect"     component={RoleSelectScreen} />
            <Stack.Screen name="AuthEntry"      component={AuthMethodScreen} />
            <Stack.Screen name="EmailEntry"     component={EmailEntryScreen} />
            <Stack.Screen name="PasswordCreate" component={PasswordCreateScreen} />
          </>
        ) : needsOnboarding ? (
          // ── Onboarding stack (post-auth) ──────────────────────────────────────
          // Initial screen is derived from their saved onboardingStep (drop-off recovery)
          <Stack.Group>
            <Stack.Screen name={resumeScreen}      component={screenForName(resumeScreen)} />
            <Stack.Screen name="NameEntry"         component={NameEntryScreen} />
            <Stack.Screen name="PhoneEntry"        component={PhoneEntryScreen} />
            <Stack.Screen name="PhoneVerify"       component={PhoneVerifyScreen} />
            <Stack.Screen name="Permissions"       component={PermissionsScreen} />
            <Stack.Screen name="CircleSetup"       component={CircleSetupScreen} />
            <Stack.Screen name="EmergencyBuddy"    component={EmergencyBuddyScreen} />
            <Stack.Screen name="CameraCalibration" component={CameraCalibrationScreen} />
            <Stack.Screen name="PlanSelect"        component={PlanSelectScreen} />
            <Stack.Screen name="TermsAccept"       component={TermsAcceptScreen} />
            <Stack.Screen name="Welcome"           component={WelcomeScreen} />
          </Stack.Group>
        ) : (
          // ── Main app stack ────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Main"   component={MainTabs} />
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Debug"  component={DebugScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Helper: map screen name → component for the dynamic initialRouteName screen
const SCREEN_COMPONENTS = {
  NameEntry:         NameEntryScreen,
  PhoneEntry:        PhoneEntryScreen,
  PhoneVerify:       PhoneVerifyScreen,
  Permissions:       PermissionsScreen,
  CircleSetup:       CircleSetupScreen,
  EmergencyBuddy:    EmergencyBuddyScreen,
  CameraCalibration: CameraCalibrationScreen,
  PlanSelect:        PlanSelectScreen,
  TermsAccept:       TermsAcceptScreen,
  Welcome:           WelcomeScreen,
};

function screenForName(name) {
  return SCREEN_COMPONENTS[name] ?? NameEntryScreen;
}

