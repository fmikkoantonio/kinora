import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, Screen } from "@/components/Screen";
import { colors, recordCategoryTones } from "@/constants/theme";
import { useMedicalRecords } from "@/context/MedicalRecordsContext";
import { formatMedicalDate } from "@/lib/formatMedicalDate";
import { supabase } from "@/lib/supabase";
import type { MedicalAttachment } from "@/types/medical";

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getVisit } = useMedicalRecords();
  const visit = getVisit(id);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function createAttachmentUrls() {
      if (!supabase || !visit) return;
      const attachments = visit.examinations.flatMap((examination) => examination.attachments ?? []);
      const nextUrls: Record<string, string> = {};
      for (const attachment of attachments) {
        if (!attachment.storagePath) continue;
        const { data, error } = await supabase.storage
          .from("medical-record-attachments")
          .createSignedUrl(attachment.storagePath, 60);
        if (error) {
          Alert.alert("Could not open attachment", error.message);
          continue;
        }
        nextUrls[attachment.storagePath] = data.signedUrl;
      }
      if (active) setSignedUrls(nextUrls);
    }
    void createAttachmentUrls();
    return () => { active = false; };
  }, [visit]);

  async function openAttachment(attachment: MedicalAttachment) {
    const url = attachment.storagePath ? signedUrls[attachment.storagePath] : attachment.uri;
    if (!url) {
      Alert.alert("Attachment unavailable", "This file is not available on this device.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Could not open attachment", error instanceof Error ? error.message : "Please try again.");
    }
  }

  if (!visit) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={19} color={colors.primary} /><Text style={styles.backText}>Back to records</Text></Pressable>
        <Card><Text style={styles.notFound}>This record could not be found.</Text></Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={19} color={colors.primary} /><Text style={styles.backText}>Medical records</Text></Pressable>
      <View>
        <Text style={styles.eyebrow}>MEDICAL RECORD</Text>
        <Text style={styles.title}>{visit.examinations.map((exam) => exam.name).join(", ") || "Medical record"}</Text>
        <Text style={styles.meta}>{formatMedicalDate(visit.examinationDate)} · {visit.facility || "Facility not provided"}</Text>
      </View>
      <Card style={styles.patientCard}>
        <View style={styles.patientIcon}><Ionicons name="person-outline" size={18} color={colors.primary} /></View>
        <View>
          <Text style={styles.patientLabel}>FAMILY MEMBER</Text>
          <Text style={styles.patientName}>{visit.patientName}</Text>
        </View>
      </Card>
      {visit.examinations.map((exam) => {
        const tone = recordCategoryTones[exam.category];
        return (
          <View key={exam.id} style={styles.examSection}>
            <View style={styles.examHeader}>
              <View style={[styles.examIcon, { backgroundColor: tone.iconBackground }]}>
                <Ionicons name="document-text-outline" size={17} color={tone.accent} />
              </View>
              <View style={styles.examCopy}>
                <Text style={styles.examTitle}>{exam.name}</Text>
                <Text style={[styles.category, { color: tone.accent }]}>{exam.category}</Text>
              </View>
            </View>
            {exam.parameters.map((parameter) => (
              <View key={parameter.id} style={styles.resultRow}>
                <Text style={styles.parameterName}>{parameter.name}</Text>
                <Text style={styles.parameterValue}>
                  {parameter.value || "Not entered"}{parameter.value && parameter.unit ? ` ${parameter.unit}` : ""}
                </Text>
                {parameter.referenceMin || parameter.referenceMax ? (
                  <Text style={styles.reference}>Reference: {parameter.referenceMin || "—"} to {parameter.referenceMax || "—"}{parameter.unit ? ` ${parameter.unit}` : ""}</Text>
                ) : null}
              </View>
            ))}
            {(exam.attachments ?? []).length ? (
              <View style={styles.attachments}>
                <Text style={styles.attachmentHeading}>Attachments</Text>
                {(exam.attachments ?? []).map((attachment) => (
                  <Pressable key={`${attachment.name}-${attachment.storagePath ?? attachment.uri}`} style={styles.attachment} onPress={() => void openAttachment(attachment)}>
                    <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                    <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                    <Ionicons name="open-outline" size={16} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      {visit.notes ? (
        <Card>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{visit.notes}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 28 },
  backText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 21, fontWeight: "800", marginTop: 5, lineHeight: 27 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 5 },
  patientCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  patientIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  patientLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  patientName: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 2 },
  examSection: { padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 },
  examHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  examIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  examCopy: { flex: 1, gap: 2 },
  examTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  category: { fontSize: 10, fontWeight: "700" },
  resultRow: { paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border, gap: 3 },
  parameterName: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  parameterValue: { color: colors.text, fontSize: 13, fontWeight: "700" },
  reference: { color: colors.muted, fontSize: 9 },
  attachments: { gap: 7 },
  attachmentHeading: { color: colors.text, fontSize: 11, fontWeight: "800" },
  attachment: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.primaryLight },
  attachmentName: { flex: 1, color: colors.text, fontSize: 11, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  notes: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  notFound: { color: colors.muted, fontSize: 13 },
});
