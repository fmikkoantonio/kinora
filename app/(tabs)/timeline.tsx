import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Screen } from "@/components/Screen";
import { DropdownField } from "@/components/DropdownField";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { colors, recordCategoryTones } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useFamilyDirectory } from "@/context/FamilyDirectoryContext";
import { useMedicalRecords } from "@/context/MedicalRecordsContext";
import { formatMedicalDate } from "@/lib/formatMedicalDate";
import { getFamilyMemberOptions } from "@/lib/familyMemberOptions";

export default function TimelineScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, loading: familyLoading, refresh: refreshFamily } = useFamilyDirectory();
  const { visits, loading, refresh } = useMedicalRecords();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const memberOptions = useMemo(
    () => getFamilyMemberOptions(groups, user?.id),
    [groups, user?.id],
  );
  const timeline = visits
    .filter((visit) => !selectedMember || visit.patientId === selectedMember)
    .slice()
    .sort((a, b) => b.examinationDate.localeCompare(a.examinationDate));

  return (
    <Screen
      refreshing={loading || familyLoading}
      onRefresh={() => void Promise.all([refresh(), refreshFamily()])}
    >
      <View>
        <Text style={styles.eyebrow}>AT A GLANCE</Text>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.subtitle}>Medical records, arranged by date.</Text>
      </View>
      <View style={styles.filter}>
        <Text style={styles.label}>FAMILY MEMBER</Text>
        <DropdownField label="Family member" value={selectedMember} options={memberOptions} onChange={setSelectedMember} searchable />
      </View>
      {loading && !visits.length ? [0, 1, 2].map((item) => (
        <View key={item} style={styles.row} accessibilityLabel="Loading timeline records">
          <View style={styles.rail}>
            <SkeletonBlock width={11} height={11} borderRadius={6} style={styles.skeletonDot} />
            {item < 2 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.event}>
            <SkeletonBlock width={92} height={10} />
            <Card style={styles.eventCard}>
              <View style={styles.eventTop}>
                <SkeletonBlock width={36} height={36} borderRadius={12} />
                <View style={styles.eventCopy}>
                  <SkeletonBlock width="76%" height={12} />
                  <SkeletonBlock width="50%" height={10} />
                  <SkeletonBlock width="68%" height={10} />
                </View>
                <SkeletonBlock width={12} height={16} borderRadius={6} />
              </View>
            </Card>
          </View>
        </View>
      )) : timeline.map((visit, index) => {
        const category = visit.examinations[0]?.category ?? "Other";
        const tone = recordCategoryTones[category];
        return (
          <View key={visit.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: tone.accent }]} />
              {index < timeline.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <Pressable onPress={() => router.push({ pathname: "/record/[id]", params: { id: visit.id } })} style={styles.event}>
              <Text style={styles.date}>{formatMedicalDate(visit.examinationDate)}</Text>
              <Card style={styles.eventCard}>
                <View style={styles.eventTop}>
                  <View style={[styles.icon, { backgroundColor: tone.iconBackground }]}>
                    <Ionicons name="document-text-outline" size={17} color={tone.accent} />
                  </View>
                  <View style={styles.eventCopy}>
                    <Text style={styles.eventTitle}>{visit.examinations.map((exam) => exam.name).join(", ") || "Medical record"}</Text>
                    <Text style={styles.member}>{visit.patientName}</Text>
                    <Text style={styles.facility}>{visit.facility || "Facility not provided"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                </View>
              </Card>
            </Pressable>
          </View>
        );
      })}
      {!loading && !timeline.length ? (
        <Card style={styles.empty}>
          <Ionicons name="time-outline" size={24} color={colors.primary} />
          <Text style={styles.emptyText}>No records in this timeline yet.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  filter: { gap: 6 },
  label: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  row: { flexDirection: "row", gap: 11 },
  rail: { width: 18, alignItems: "center" },
  dot: { width: 11, height: 11, borderRadius: 6, marginTop: 17, zIndex: 1 },
  skeletonDot: { marginTop: 17 },
  line: { position: "absolute", top: 26, bottom: -12, width: 2, backgroundColor: colors.border },
  event: { flex: 1, gap: 6 },
  date: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  eventCard: { padding: 11 },
  eventTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventCopy: { flex: 1, gap: 3 },
  eventTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  member: { color: colors.text, fontSize: 10 },
  facility: { color: colors.muted, fontSize: 10 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { color: colors.muted, fontSize: 12 },
});
