import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen           from "../screens/main/ProfileScreen";
import SettingsScreen          from "../screens/main/SettingsScreen";
import DevicePermissionsScreen from "../screens/main/DevicePermissionsScreen";
import CameraDetailScreen      from "../screens/main/CameraDetailScreen";
import NotificationsDetailScreen   from "../screens/main/NotificationsDetailScreen";
import TermsAndConditionsScreen    from "../screens/main/TermsAndConditionsScreen";
import PrivacyAndSecurityScreen    from "../screens/main/PrivacyAndSecurityScreen";
import DataSecurityScreen          from "../screens/main/DataSecurityScreen";
import PrivacyChoicesScreen        from "../screens/main/PrivacyChoicesScreen";
import PrivacyPolicyScreen         from "../screens/main/PrivacyPolicyScreen";
import SubscriptionScreen          from "../screens/main/SubscriptionScreen";

const Stack = createNativeStackNavigator();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#030B11" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="ProfileHome"          component={ProfileScreen} />
      <Stack.Screen name="Settings"             component={SettingsScreen} />
      <Stack.Screen name="DevicePermissions"    component={DevicePermissionsScreen} />
      <Stack.Screen name="CameraDetail"         component={CameraDetailScreen} />
      <Stack.Screen name="NotificationsDetail"  component={NotificationsDetailScreen} />
      <Stack.Screen name="TermsAndConditions"   component={TermsAndConditionsScreen} />
      <Stack.Screen name="PrivacyAndSecurity"   component={PrivacyAndSecurityScreen} />
      <Stack.Screen name="DataSecurity"         component={DataSecurityScreen} />
      <Stack.Screen name="PrivacyChoices"       component={PrivacyChoicesScreen} />
      <Stack.Screen name="PrivacyPolicy"        component={PrivacyPolicyScreen} />
      <Stack.Screen name="Subscription"         component={SubscriptionScreen} />
    </Stack.Navigator>
  );
}
