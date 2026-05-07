import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { Colors } from "../theme/colors";

import CircleScreen  from "../screens/main/CircleScreen";
import DriveScreen   from "../screens/DrivingScreen";
import ProfileNavigator from "./ProfileNavigator";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { Circle: "◎", Drive: "◉", Profile: "○" };
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
      initialRouteName="Drive"
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
          backgroundColor: Colors.bgPrimary,
          borderTopColor: "#0a1520",
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
        },
        tabBarActiveTintColor:   Colors.brandBlue,
        tabBarInactiveTintColor: Colors.textMuted,
      })}
    >
      <Tab.Screen name="Circle"  component={CircleScreen} />
      <Tab.Screen name="Drive"   component={DriveScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
