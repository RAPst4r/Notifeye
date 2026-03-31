import { SafeAreaProvider } from "react-native-safe-area-context";
import DebugScreen from "./src/screens/DebugScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <DebugScreen />
    </SafeAreaProvider>
  );
}
