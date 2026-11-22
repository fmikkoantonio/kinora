import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FamilyDirectoryProvider } from "@/context/FamilyDirectoryContext";
import { MedicalRecordsProvider } from "@/context/MedicalRecordsContext";
import { colors } from "@/constants/theme";

function AppNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === "(auth)";

  useEffect(() => {
    if (loading) return;
    if (!user && !inAuthGroup) router.replace("/(auth)/sign-in");
    else if (user && inAuthGroup) router.replace("/(tabs)");
  }, [inAuthGroup, loading, router, user]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

function AppContent() {
  const { user } = useAuth();
  return (
    <FamilyDirectoryProvider key={user?.id ?? "signed-out"}>
      <MedicalRecordsProvider key={user?.id ?? "signed-out"}>
        <AppNavigator />
      </MedicalRecordsProvider>
    </FamilyDirectoryProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <StatusBar style="dark" />
          <AppContent />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
