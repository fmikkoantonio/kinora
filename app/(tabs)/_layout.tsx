import { StyleSheet, View, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

type TabIconName = "home-outline" | "folder-open-outline" | "time-outline" | "people-outline" | "person-circle-outline";

function tabIcon(name: TabIconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => {
    const iconColor = focused
      ? colors.surface
      : color === null || typeof color === "number"
        ? "#8795A3"
        : color;
    return (
      <View style={[styles.iconContainer, focused && styles.selectedIcon]}>
        <Ionicons name={name} color={iconColor} size={size} />
      </View>
    );
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: "#8795A3",
      tabBarStyle: [
        styles.tabBar,
        { height: 72 + insets.bottom, paddingBottom: 8 + insets.bottom },
      ],
      tabBarLabelStyle: styles.tabLabel,
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="records" options={{ title: "Records", tabBarIcon: tabIcon("folder-open-outline") }} />
      <Tabs.Screen name="timeline" options={{ title: "Timeline", tabBarIcon: tabIcon("time-outline") }} />
      <Tabs.Screen name="family" options={{ title: "Family", tabBarIcon: tabIcon("people-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person-circle-outline") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: "#18344D",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  tabLabel: { fontSize: 10, fontWeight: "600" },
  iconContainer: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  selectedIcon: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    transform: [{ translateY: -8 }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 8,
  },
});
