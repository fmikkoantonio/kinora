import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const { signIn, signUp, configured, startupError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isSignUp = mode === "sign-up";

  async function submit() {
    setError("");
    setMessage("");
    if (isSignUp && !name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        const needsEmailConfirmation = await signUp(name, email, password);
        if (needsEmailConfirmation) {
          setMessage("Check your email to confirm your account, then sign in.");
          return;
        }
      } else {
        await signIn(email, password);
      }
      router.replace("/(tabs)");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Image
        source={require("../assets/images/kinora-logo.png")}
        style={styles.brandLogo}
        resizeMode="contain"
        accessibilityLabel="Kinora logo"
      />
      <Text style={styles.title}>{isSignUp ? "Create your account" : "Welcome back"}</Text>
      <Text style={styles.subtitle}>
        {isSignUp
          ? "Your account will start a private family group. You can add related users later."
          : "Sign in to your private family health space."}
      </Text>

      <View style={styles.form}>
        {!configured ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Supabase setup required</Text>
            <Text style={styles.noticeText}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your local .env file, then apply the included database migration.
            </Text>
          </View>
        ) : null}
        {startupError ? <Text style={styles.error}>{startupError}</Text> : null}
        {isSignUp ? (
          <>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#9AA7B3"
              style={styles.input}
              autoComplete="name"
              textContentType="name"
              accessibilityLabel="Full name"
            />
          </>
        ) : null}
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#9AA7B3"
          style={styles.input}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          accessibilityLabel="Email"
        />
        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.passwordField}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#9AA7B3"
            style={styles.passwordInput}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            textContentType={isSignUp ? "newPassword" : "password"}
            accessibilityLabel="Password"
          />
          <Pressable
            onPress={() => setShowPassword((visible) => !visible)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
        <Pressable
          onPress={submit}
          disabled={!configured || busy}
          style={[styles.submit, (!configured || busy) && styles.submitDisabled]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isSignUp ? "Create account" : "Sign in"}</Text>}
        </Pressable>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{isSignUp ? "Already have an account?" : "New to Kinora?"}</Text>
        <Link href={isSignUp ? "/(auth)/sign-in" : "/(auth)/sign-up"} asChild>
          <Pressable><Text style={styles.switchLink}>{isSignUp ? "Sign in" : "Create account"}</Text></Pressable>
        </Link>
      </View>
      <Text style={styles.privacy}>
        Medical records are stored in your connected database and shared with your family groups. Passwords are handled by Supabase Auth.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: "center", padding: 22, paddingVertical: 36, backgroundColor: colors.background, width: "100%", maxWidth: 520, alignSelf: "center", gap: 12 },
  brandLogo: { width: 128, height: 128, alignSelf: "center" },
  title: { textAlign: "center", fontSize: 26, fontWeight: "800", color: colors.text, marginTop: 6 },
  subtitle: { textAlign: "center", color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  form: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 10 },
  notice: { backgroundColor: colors.warningLight, borderRadius: 12, padding: 12, gap: 4, marginBottom: 4 },
  noticeTitle: { fontSize: 12, fontWeight: "800", color: colors.warning },
  noticeText: { fontSize: 11, color: colors.text, lineHeight: 16 },
  label: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: colors.muted, marginTop: 4 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", paddingHorizontal: 13, color: colors.text, fontSize: 14 },
  passwordField: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingRight: 13 },
  passwordInput: { flex: 1, height: "100%", paddingHorizontal: 13, color: colors.text, fontSize: 14 },
  submit: { minHeight: 49, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 6 },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  error: { color: "#B42318", fontSize: 12, lineHeight: 17 },
  message: { color: colors.success, fontSize: 12, lineHeight: 17 },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 4 },
  switchText: { fontSize: 12, color: colors.muted },
  switchLink: { fontSize: 12, color: colors.primary, fontWeight: "800" },
  privacy: { fontSize: 10, color: colors.muted, textAlign: "center", lineHeight: 15, marginTop: 8 },
});
