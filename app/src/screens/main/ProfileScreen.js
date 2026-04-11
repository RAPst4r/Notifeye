import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../theme/colors";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: "center", justifyContent: "center" },
  text: { color: Colors.textMuted, fontSize: 14 },
});
