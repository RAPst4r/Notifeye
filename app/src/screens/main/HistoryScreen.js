import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../theme/colors";

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>History — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: "center", justifyContent: "center" },
  text: { color: Colors.textMuted, fontSize: 14 },
});
