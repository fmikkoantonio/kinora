import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, Screen } from "@/components/Screen";
import { DropdownField, DropdownOption } from "@/components/DropdownField";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { colors, recordCategoryTones } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useFamilyDirectory } from "@/context/FamilyDirectoryContext";
import { useMedicalRecords } from "@/context/MedicalRecordsContext";
import { formatMedicalDate } from "@/lib/formatMedicalDate";
import { getFamilyMemberOptions } from "@/lib/familyMemberOptions";
import type { MedicalVisit, RecordCategory } from "@/types/medical";

const categoryOptions: DropdownOption[] = [
  { label: "All", value: null },
  { label: "Lab", value: "Laboratory" },
  { label: "Imaging", value: "Imaging" },
  { label: "ECG", value: "ECG" },
  { label: "Other", value: "Other" },
];

function SwipeRecordCard({
  visit,
  canRemove,
  onRemove,
  onOpen,
}: {
  visit: MedicalVisit;
  canRemove: boolean;
  onRemove: (visit: MedicalVisit) => void;
  onOpen: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const cardWidth = useRef(0);
  const [swipeActive, setSwipeActive] = useState(false);
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => canRemove
      && Math.abs(gesture.dx) > Math.abs(gesture.dy)
      && gesture.dx < -8,
    onPanResponderGrant: () => {
      setSwipeActive(true);
    },
    onPanResponderMove: (_event, gesture) => {
      const maxSwipe = cardWidth.current / 3;
      translateX.setValue(Math.max(-maxSwipe, Math.min(0, gesture.dx)));
    },
    onPanResponderRelease: (_event, gesture) => {
      const maxSwipe = cardWidth.current / 3;
      if (gesture.dx < -(maxSwipe * 0.6)) onRemove(visit);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 180,
        friction: 18,
      }).start(({ finished }) => { if (finished) setSwipeActive(false); });
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setSwipeActive(false);
      });
    },
  }), [canRemove, onRemove, translateX, visit]);
  const category = visit.examinations[0]?.category ?? "Other";
  const tone = recordCategoryTones[category];
  const icon = category === "Laboratory" ? "flask-outline" : category === "Imaging" ? "scan-outline" : category === "ECG" ? "pulse-outline" : "document-text-outline";

  return (
    <View style={styles.swipeContainer}>
      {canRemove ? (
        <View style={styles.removeReveal}>
          <View style={styles.removeAction}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.removeRevealText}>Remove</Text>
          </View>
        </View>
      ) : null}
      <Animated.View
        {...(canRemove ? panResponder.panHandlers : {})}
        style={[styles.recordCard, swipeActive && styles.recordCardSwiped, { transform: [{ translateX }] }]}
        onLayout={(event) => { cardWidth.current = event.nativeEvent.layout.width; }}
        accessibilityActions={canRemove ? [{ name: "remove", label: "Remove record" }] : undefined}
        onAccessibilityAction={canRemove ? () => onRemove(visit) : undefined}
      >
        <Pressable onPress={onOpen} style={styles.recordPressable} accessibilityRole="button">
          <View style={styles.recordCategory}>
            <View style={[styles.recordIcon, { backgroundColor: tone.iconBackground }]}>
              <Ionicons name={icon} size={19} color={tone.accent} />
            </View>
            <Text style={[styles.categoryText, { color: tone.accent }]}>{category === "Laboratory" ? "Lab" : category}</Text>
          </View>
          <View style={styles.recordCopy}>
            <Text style={styles.recordTitle} numberOfLines={2}>
              {visit.examinations.map((exam) => exam.name).join(", ") || "Medical record"}
            </Text>
            <Text style={styles.recordPatient} numberOfLines={1}>{visit.patientName}</Text>
            <Text style={styles.recordMeta} numberOfLines={1}>
              {formatMedicalDate(visit.examinationDate)} · {visit.facility || "Facility not provided"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const { category: categoryParam } = useLocalSearchParams<{ category?: string | string[] }>();
  const { user } = useAuth();
  const { groups, loading: familyLoading, refresh: refreshFamily } = useFamilyDirectory();
  const { visits, loading, error, refresh, removeVisit } = useMedicalRecords();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const category = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
    return category && categoryOptions.some((option) => option.value === category) ? category : null;
  });
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingVisit, setPendingVisit] = useState<MedicalVisit | null>(null);
  const [removing, setRemoving] = useState(false);

  const memberOptions = useMemo(
    () => getFamilyMemberOptions(groups, user?.id),
    [groups, user?.id],
  );
  const filteredVisits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visits.filter((visit) => {
      const categoryMatches = !selectedCategory || visit.examinations.some((exam) => exam.category === selectedCategory);
      const memberMatches = !selectedMember || visit.patientId === selectedMember;
      const searchMatches = !term || [
        visit.patientName,
        visit.facility,
        visit.examinationDate,
        ...visit.examinations.map((exam) => exam.name),
      ].some((value) => value.toLowerCase().includes(term));
      return categoryMatches && memberMatches && searchMatches;
    });
  }, [search, selectedCategory, selectedMember, visits]);

  async function confirmRemove() {
    if (!pendingVisit) return;
    setRemoving(true);
    try {
      await removeVisit(pendingVisit.id);
      setPendingVisit(null);
    } catch (removeError) {
      Alert.alert("Could not remove record", removeError instanceof Error ? removeError.message : "Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  const requestRemove = (visit: MedicalVisit) => setPendingVisit(visit);

  return (
    <>
      <Screen
        refreshing={loading || familyLoading}
        onRefresh={() => void Promise.all([refresh(), refreshFamily()])}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR HEALTH HISTORY</Text>
            <Text style={styles.title}>Medical records</Text>
          </View>
          <Pressable onPress={() => router.push("/add-record")} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Add a medical record">
            <Ionicons name="add" size={21} color={colors.primary} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search tests, dates, or facilities" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
        </View>

        <View style={styles.filters}>
          <View style={styles.filter}>
            <Text style={styles.filterLabel}>FAMILY MEMBER</Text>
            <DropdownField label="Family member" value={selectedMember} options={memberOptions} onChange={setSelectedMember} searchable />
          </View>
        </View>

        <View style={styles.categoryFilter}>
          <Text style={styles.filterLabel}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
            {categoryOptions.map((option) => {
              const selected = option.value === selectedCategory;
              return (
                <Pressable
                  key={option.value ?? "all"}
                  onPress={() => setSelectedCategory(option.value)}
                  style={[styles.categoryTab, selected && styles.categoryTabSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.categoryTabText, selected && styles.categoryTabTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Records could not be loaded</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void refresh()}><Text style={styles.retry}>Try again</Text></Pressable>
          </Card>
        ) : null}

        {loading && !visits.length ? (
          <SkeletonBlock width={58} height={11} />
        ) : (
          <Text style={styles.resultCount}>{filteredVisits.length} {filteredVisits.length === 1 ? "record" : "records"}</Text>
        )}
        {loading && !visits.length ? [0, 1, 2].map((item) => (
          <View key={item} style={styles.recordCard} accessibilityLabel="Loading medical records">
            <View style={styles.recordPressable}>
              <View style={styles.recordCategory}>
                <SkeletonBlock width={40} height={40} borderRadius={13} />
                <SkeletonBlock width={22} height={9} />
              </View>
              <View style={styles.recordCopy}>
                <SkeletonBlock width="78%" height={12} />
                <SkeletonBlock width="46%" height={10} />
                <SkeletonBlock width="88%" height={10} />
              </View>
              <SkeletonBlock width={12} height={16} borderRadius={6} />
            </View>
          </View>
        )) : filteredVisits.map((visit) => (
          <SwipeRecordCard
            key={visit.id}
            visit={visit}
            canRemove={Boolean(user && visit.patientId === user.id)}
            onRemove={requestRemove}
            onOpen={() => router.push({ pathname: "/record/[id]", params: { id: visit.id } })}
          />
        ))}
        {!loading && filteredVisits.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="folder-open-outline" size={24} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>No records found</Text>
            <Text style={styles.emptyText}>{search || selectedCategory || selectedMember ? "Try changing the search or filters." : "Add a medical record to get started."}</Text>
          </Card>
        ) : null}
        <Text style={styles.swipeHint}>Swipe your record left to remove it.</Text>
      </Screen>

      <Modal visible={Boolean(pendingVisit)} transparent animationType="fade" onRequestClose={() => setPendingVisit(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPendingVisit(null)} accessibilityLabel="Close confirmation" />
          <View style={styles.confirmCard} accessibilityViewIsModal>
            <View style={styles.confirmIcon}><Ionicons name="trash-outline" size={22} color="#B42318" /></View>
            <Text style={styles.confirmTitle}>Are you sure?</Text>
            <Text style={styles.confirmText}>Remove this medical record and its attached files?</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.cancelButton} onPress={() => setPendingVisit(null)} disabled={removing}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => void confirmRemove()} disabled={removing}>
                <Text style={styles.deleteText}>{removing ? "Removing…" : "Remove record"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  addButton: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, backgroundColor: colors.surface },
  addButtonText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  searchBox: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.text, fontSize: 12, paddingVertical: 10 },
  filters: { gap: 10 },
  filter: { gap: 6 },
  filterLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  categoryFilter: { gap: 4 },
  categoryTabs: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryTab: { minHeight: 22, justifyContent: "center", paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryTabSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  categoryTabText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  categoryTabTextSelected: { color: "#fff", fontWeight: "800" },
  resultCount: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  swipeContainer: { minHeight: 88, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface },
  removeReveal: { ...StyleSheet.absoluteFill, justifyContent: "center" },
  removeAction: { position: "absolute", top: 1, right: 1, bottom: 1, width: "33%", borderTopRightRadius: 15, borderBottomRightRadius: 15, alignItems: "center", justifyContent: "center", gap: 4, flexDirection: "row", backgroundColor: "#D92D20" },
  removeRevealText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  recordCard: { minHeight: 88, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  recordCardSwiped: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  recordPressable: { flex: 1, minHeight: 86, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11, paddingVertical: 10 },
  recordCategory: { width: 40, alignItems: "center", gap: 3 },
  recordIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  recordCopy: { flex: 1, gap: 3 },
  recordTitle: { color: colors.text, fontSize: 12, fontWeight: "800", lineHeight: 16 },
  recordPatient: { color: colors.muted, fontSize: 10 },
  recordMeta: { color: colors.muted, fontSize: 10 },
  categoryText: { fontSize: 9, fontWeight: "800", textAlign: "center" },
  errorCard: { borderColor: "#F4C7C4" },
  errorTitle: { color: "#B42318", fontSize: 13, fontWeight: "800" },
  errorText: { color: colors.text, fontSize: 11, lineHeight: 16 },
  retry: { color: colors.primary, fontSize: 12, fontWeight: "800", marginTop: 2 },
  emptyCard: { alignItems: "center", paddingVertical: 24 },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  swipeHint: { color: colors.muted, fontSize: 10, textAlign: "center" },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 22, backgroundColor: "rgba(25,42,58,0.42)" },
  confirmCard: { width: "100%", maxWidth: 390, padding: 20, borderRadius: 20, gap: 10, backgroundColor: colors.surface, alignItems: "center" },
  confirmIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#FEE4E2", alignItems: "center", justifyContent: "center" },
  confirmTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  confirmText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  confirmActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 8 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F6F8" },
  cancelText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  deleteButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#B42318" },
  deleteText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
