import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Screen } from "@/components/Screen";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { DropdownField, DropdownOption } from "@/components/DropdownField";
import { colors } from "@/constants/theme";
import { getUserDisplayName, useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const genderOptions: DropdownOption[] = [
  { label: "Prefer not to say", value: "prefer_not_to_say" },
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non_binary" },
];

async function loadProfileGender(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_my_profile_gender");
  if (error) throw error;
  if (typeof data === "string" && genderOptions.some((option) => option.value === data)) return data;
  if (data && typeof data === "object" && "gender" in data && typeof data.gender === "string") return data.gender;
  return null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [gender, setGender] = useState<string | null>(null);
  const [loadingGender, setLoadingGender] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadGender() {
      try {
        const value = await loadProfileGender();
        if (active && value) setGender(value);
      } catch (error) {
        if (active) Alert.alert("Could not load profile", error instanceof Error ? error.message : "Please try again.");
      } finally {
        if (active) setLoadingGender(false);
      }
    }
    void loadGender();
    return () => { active = false; };
  }, []);

  async function refreshProfile() {
    setRefreshing(true);
    try {
      const value = await loadProfileGender();
      if (value) setGender(value);
    } catch (error) {
      Alert.alert("Could not load profile", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  async function saveGender(value: string | null) {
    setGender(value);
    if (!value || !supabase) return;
    setSaving(true);
    const { error } = await supabase.rpc("set_my_profile_gender", { target_gender: value });
    setSaving(false);
    if (error) Alert.alert("Could not save gender preference", error.message);
  }

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      setConfirmingSignOut(false);
      router.replace("/(auth)/sign-in");
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => void refreshProfile()}>
      <View>
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
      </View>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}><Ionicons name="person" size={25} color={colors.primary} /></View>
        <Text style={styles.name}>{getUserDisplayName(user)}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </Card>
      <View style={styles.field}>
        <Text style={styles.label}>GENDER PREFERENCE</Text>
        {loadingGender ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading gender preference">
            <SkeletonBlock height={48} borderRadius={13} />
          </View>
        ) : (
          <DropdownField label="Gender preference" value={gender} options={genderOptions} onChange={(value) => void saveGender(value)} />
        )}
        {saving ? <Text style={styles.saving}>Saving…</Text> : null}
        <Text style={styles.help}>Used only to show appropriate family relationship labels, such as mother/father or son/daughter.</Text>
      </View>
      <Card style={styles.infoCard}>
        <View style={styles.infoIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.success} /></View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Your account</Text>
          <Text style={styles.infoText}>Your password is managed securely by Supabase Auth.</Text>
        </View>
      </Card>
      <Pressable onPress={() => { setSignOutError(null); setConfirmingSignOut(true); }} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={18} color="#B42318" />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      <Modal
        visible={confirmingSignOut}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingSignOut(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setConfirmingSignOut(false)}
            disabled={signingOut}
            accessibilityLabel="Close sign out confirmation"
          />
          <View style={styles.confirmCard} accessibilityViewIsModal>
            <Text style={styles.confirmTitle}>Sign out?</Text>
            <Text style={styles.confirmText}>You can sign back in to access your family records.</Text>
            {signOutError ? <Text style={styles.signOutError}>{signOutError}</Text> : null}
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setConfirmingSignOut(false)}
                disabled={signingOut}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, signingOut && styles.disabled]}
                onPress={() => void handleSignOut()}
                disabled={signingOut}
              >
                {signingOut
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmButtonText}>Sign out</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  profileCard: { alignItems: "center", paddingVertical: 23 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  name: { color: colors.text, fontSize: 17, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 12 },
  field: { gap: 7 },
  label: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  loading: { height: 48, justifyContent: "center" },
  saving: { color: colors.muted, fontSize: 10 },
  help: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  infoCard: { flexDirection: "row", alignItems: "center" },
  infoIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.successLight, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1, gap: 3 },
  infoTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  infoText: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  signOut: { minHeight: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FEE4E2" },
  signOutText: { color: "#B42318", fontSize: 13, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 22, backgroundColor: "rgba(25,42,58,0.42)" },
  confirmCard: { width: "100%", maxWidth: 390, padding: 20, borderRadius: 20, gap: 10, backgroundColor: colors.surface, alignItems: "center" },
  confirmTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  confirmText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  signOutError: { color: "#B42318", fontSize: 12, lineHeight: 17, textAlign: "center" },
  confirmActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 8 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F6F8" },
  cancelText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  confirmButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#B42318" },
  confirmButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
