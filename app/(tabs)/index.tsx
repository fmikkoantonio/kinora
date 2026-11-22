import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Screen } from "@/components/Screen";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { SectionTitle } from "@/components/SectionTitle";
import { colors, recordCategoryTones } from "@/constants/theme";
import { getUserDisplayName, useAuth } from "@/context/AuthContext";
import { useFamilyDirectory } from "@/context/FamilyDirectoryContext";
import { useMedicalRecords } from "@/context/MedicalRecordsContext";
import { formatMedicalDate } from "@/lib/formatMedicalDate";
import type { RecordCategory } from "@/types/medical";

const categories: {
  label: string;
  category?: RecordCategory;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "All records", icon: "documents-outline" },
  { label: "Lab", category: "Laboratory", icon: "flask-outline" },
  { label: "Imaging", category: "Imaging", icon: "scan-outline" },
  { label: "ECG", category: "ECG", icon: "pulse-outline" },
  {
    label: "Other",
    category: "Other",
    icon: "ellipsis-horizontal-circle-outline",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, loading: familyLoading, refresh: refreshFamily } = useFamilyDirectory();
  const { visits, loading, refresh: refreshRecords } = useMedicalRecords();
  const counts = useMemo(
    () => ({
      all: visits.length,
      byCategory: Object.fromEntries(
        categories
          .filter((item) => item.category)
          .map((item) => [
            item.category!,
            visits.filter((visit) =>
              visit.examinations.some(
                (exam) => exam.category === item.category,
              ),
            ).length,
          ]),
      ) as Record<RecordCategory, number>,
    }),
    [visits],
  );
  const recent = visits.slice(0, 3);

  function openRecords(category?: RecordCategory) {
    router.push(
      category
        ? { pathname: "/(tabs)/records", params: { category } }
        : "/(tabs)/records",
    );
  }

  return (
    <Screen
      refreshing={loading || familyLoading}
      onRefresh={() => void Promise.all([refreshRecords(), refreshFamily()])}
    >
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.name}>{getUserDisplayName(user)}</Text>
        </View>
        <Image
          source={require("../../assets/images/kinora-icon.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Kinora icon"
        />
      </View>

      <Card style={styles.welcomeCard}>
        <View style={styles.welcomeIcon}>
          <Ionicons name="heart" size={20} color={colors.primary} />
        </View>
        <View style={styles.welcomeCopy}>
          <Text style={styles.welcomeTitle}>Your family health, together</Text>
          <Text style={styles.welcomeText}>
            Keep important medical results organized and easy to find.
          </Text>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        {categories.map((item, index) => {
          const tone = item.category
            ? recordCategoryTones[item.category]
            : { iconBackground: colors.primaryLight, accent: colors.primary };
          const count = item.category
            ? counts.byCategory[item.category]
            : counts.all;
          return (
            <Pressable
              key={item.label}
              onPress={() => openRecords(item.category)}
              style={[styles.statCard, index < 2 && styles.statCardWide]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${count} records`}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: tone.iconBackground },
                ]}
              >
                <Ionicons name={item.icon} size={19} color={tone.accent} />
              </View>
              {loading ? (
                <SkeletonBlock width={30} height={22} />
              ) : (
                <Text style={[styles.statCount, { color: tone.accent }]}>
                  {count}
                </Text>
              )}
              <Text style={styles.statLabel}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <SectionTitle title="Your family groups" />
        {familyLoading ? (
          [0, 1].map((item) => (
            <View key={item} style={styles.groupCard} accessibilityLabel="Loading family groups">
              <SkeletonBlock width={38} height={38} borderRadius={13} />
              <View style={styles.groupCopy}>
                <SkeletonBlock width="62%" height={12} />
                <SkeletonBlock width="34%" height={10} />
              </View>
            </View>
          ))
        ) : groups.length ? (
          groups.map((group) => (
            <Pressable
              key={group.group_id}
              style={styles.groupCard}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/family",
                  params: { groupId: group.group_id },
                })
              }
            >
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={18} color={colors.primary} />
              </View>
              <View style={styles.groupCopy}>
                <Text style={styles.groupName}>{group.group_name}</Text>
                <Text style={styles.groupMeta}>
                  {group.members.length}{" "}
                  {group.members.length === 1 ? "member" : "members"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))
        ) : (
          <Card>
            <Text style={styles.emptyText}>No family groups found yet.</Text>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SectionTitle title="Recently added" />
          <Pressable onPress={() => openRecords()} accessibilityRole="button">
            <Text style={styles.link}>See all</Text>
          </Pressable>
        </View>
        {loading ? (
          [0, 1].map((item) => (
            <View key={item} style={styles.recentCard} accessibilityLabel="Loading medical records">
              <View style={styles.recentCategory}>
                <SkeletonBlock width={40} height={40} borderRadius={13} />
                <SkeletonBlock width={22} height={9} />
              </View>
              <View style={styles.recentCopy}>
                <SkeletonBlock width="76%" height={12} />
                <SkeletonBlock width="48%" height={10} />
                <SkeletonBlock width="88%" height={10} />
              </View>
            </View>
          ))
        ) : recent.length ? (
          recent.map((visit) => {
            const category = visit.examinations[0]?.category ?? "Other";
            const tone = recordCategoryTones[category];
            return (
              <Pressable
                key={visit.id}
                onPress={() =>
                  router.push({
                    pathname: "/record/[id]",
                    params: { id: visit.id },
                  })
                }
                style={styles.recentCard}
              >
                <View style={styles.recentCategory}>
                  <View
                    style={[
                      styles.recentIcon,
                      { backgroundColor: tone.iconBackground },
                    ]}
                  >
                    <Ionicons
                      name={
                        category === "Laboratory"
                          ? "flask-outline"
                          : category === "Imaging"
                            ? "scan-outline"
                            : category === "ECG"
                              ? "pulse-outline"
                              : "document-text-outline"
                      }
                      size={19}
                      color={tone.accent}
                    />
                  </View>
                  <Text
                    style={[styles.recentCategoryText, { color: tone.accent }]}
                  >
                    {category === "Laboratory" ? "Lab" : category}
                  </Text>
                </View>
                <View style={styles.recentCopy}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {visit.examinations.map((exam) => exam.name).join(", ")}
                  </Text>
                  <Text style={styles.recentPatient} numberOfLines={1}>
                    {visit.patientName}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {formatMedicalDate(visit.examinationDate)} ·{" "}
                    {visit.facility || "Facility not provided"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.muted}
                />
              </Pressable>
            );
          })
        ) : (
          <Card>
            <Text style={styles.emptyText}>
              Your recent records will appear here.
            </Text>
          </Card>
        )}
      </View>

      <Pressable
        style={styles.addButton}
        onPress={() => router.push("/add-record")}
      >
        <Ionicons name="add" size={21} color="#fff" />
        <Text style={styles.addButtonText}>Add a medical record</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  greeting: { flex: 1, gap: 1 },
  hello: { color: colors.muted, fontSize: 15 },
  name: { color: colors.text, fontSize: 25, fontWeight: "800" },
  logo: { width: 74, height: 74 },
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
  },
  welcomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  welcomeCopy: { flex: 1, gap: 4 },
  welcomeTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  welcomeText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "31%",
    minHeight: 112,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statCardWide: { width: "48%" },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statCount: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  groupCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  groupCopy: { flex: 1, gap: 3 },
  groupName: { color: colors.text, fontSize: 13, fontWeight: "800" },
  groupMeta: { color: colors.muted, fontSize: 11 },
  recentCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 11,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentCategory: { width: 40, alignItems: "center", gap: 3 },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  recentCategoryText: { fontSize: 9, fontWeight: "800", textAlign: "center" },
  recentCopy: { flex: 1, gap: 3 },
  recentTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  recentPatient: { color: colors.muted, fontSize: 10 },
  recentMeta: { color: colors.muted, fontSize: 10 },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  addButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
