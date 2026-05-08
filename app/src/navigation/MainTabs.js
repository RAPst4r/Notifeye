import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { Colors } from "../theme/colors";

import HomeScreen    from "../screens/main/HomeScreen";
import DriveScreen   from "../screens/main/DriveScreen";
import HistoryScreen from "../screens/main/HistoryScreen";
import CircleScreen  from "../screens/main/CircleScreen";
import ProfileScreen from "../screens/main/ProfileScreen";

const Tab = createBottomTabNavigator();

// Simple text icons — swap for vector icons later
function TabIcon({ label, focused }) {
  const icons = {
    Home:    "⌂",
    Drive:   "◉",
    History: "☰",
    Circle:  "◎",
    Profile: "○",
  };
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20, color: focused ? Colors.brandBlue : Colors.textMuted }}>
        {icons[label]}
      </Text>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarLabel: ({ focused }) => (
          <Text style={{
            fontSize: 10,
            color: focused ? Colors.brandBlue : Colors.textMuted,
            marginBottom: 4,
          }}>
            {route.name}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: Colors.bgSecondary,
          borderTopColor: "#0a1520",
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.brandBlue,
        tabBarInactiveTintColor: Colors.textMuted,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Drive"   component={DriveScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Circle"  component={CircleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
