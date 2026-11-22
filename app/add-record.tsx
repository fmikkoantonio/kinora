import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { Card, Screen } from "@/components/Screen";
import { DatePickerField } from "@/components/DatePickerField";
import { DropdownField, DropdownOption } from "@/components/DropdownField";
import { colors } from "@/constants/theme";
import { getUserDisplayName, useAuth } from "@/context/AuthContext";
import { useMedicalRecords } from "@/context/MedicalRecordsContext";
import { createExamination, diagnosticCatalog, getRecordCategory, hasResultTemplate } from "@/data/medicalRecords";
import type { MedicalAttachment, MedicalExamination, MedicalVisit, ResultParameter, ResultValueType } from "@/types/medical";

const categoryOptions: DropdownOption[] = [
  { label: "Laboratory", value: "Laboratory" },
  { label: "Imaging", value: "Imaging" },
  { label: "ECG", value: "ECG" },
  { label: "Other", value: "Other" },
];

const resultTypeOptions: DropdownOption[] = [
  { label: "Number", value: "numeric" },
  { label: "Text", value: "text" },
  { label: "Yes / no", value: "qualitative" },
  { label: "Long text", value: "longText" },
];

function isResultValueType(value: string | null): value is ResultValueType {
  return value === "numeric" || value === "text" || value === "qualitative" || value === "longText";
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AddRecordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addVisit } = useMedicalRecords();
  const [date, setDate] = useState(() => localDateString(new Date()));
  const [facility, setFacility] = useState("");
  const [notes, setNotes] = useState("");
  const [examinations, setExaminations] = useState<MedicalExamination[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const diagnosticOptions = useMemo<DropdownOption[]>(() => (
    selectedCategory
      ? diagnosticCatalog
        .filter((diagnostic) => getRecordCategory(diagnostic.diagnosticId) === selectedCategory)
        .map((diagnostic) => ({ label: diagnostic.diagnosticDescription, value: diagnostic.diagnosticId }))
      : []
  ), [selectedCategory]);

  function changeCategory(category: string | null) {
    if (category === selectedCategory) return;
    setSelectedCategory(category);
    setExaminations([]);
  }

  function addExamination(diagnosticId: string | null) {
    if (!diagnosticId) return;
    setExaminations([createExamination(diagnosticId)]);
  }

  function updateParameter(examinationId: string, parameterId: string, updates: Partial<ResultParameter>) {
    setExaminations((current) => current.map((exam) => exam.id !== examinationId ? exam : {
      ...exam,
      parameters: exam.parameters.map((parameter) => parameter.id === parameterId ? { ...parameter, ...updates } : parameter),
    }));
  }

  function addParameter(examinationId: string) {
    const parameter: ResultParameter = {
      id: createId(),
      name: "",
      type: "longText",
      value: "",
      unit: "",
      referenceMin: "",
      referenceMax: "",
    };
    setExaminations((current) => current.map((exam) => exam.id !== examinationId ? exam : {
      ...exam,
      parameters: [...exam.parameters, parameter],
    }));
  }

  function removeParameter(examinationId: string, parameterId: string) {
    setExaminations((current) => current.map((exam) => exam.id !== examinationId ? exam : {
      ...exam,
      parameters: exam.parameters.filter((parameter) => parameter.id !== parameterId),
    }));
  }

  async function addAttachments(examinationId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const attachments: MedicalAttachment[] = (result.assets ?? []).map((asset) => ({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? undefined,
      }));
      setExaminations((current) => current.map((exam) => exam.id !== examinationId ? exam : {
        ...exam,
        attachments: [...(exam.attachments ?? []), ...attachments],
      }));
    } catch (pickerError) {
      Alert.alert("Could not select files", pickerError instanceof Error ? pickerError.message : "Please try again.");
    }
  }

  function removeAttachment(examinationId: string, attachmentIndex: number) {
    setExaminations((current) => current.map((exam) => exam.id !== examinationId ? exam : {
      ...exam,
      attachments: (exam.attachments ?? []).filter((_attachment, index) => index !== attachmentIndex),
    }));
  }

  async function saveRecord() {
    if (!user) {
      Alert.alert("Sign in required", "Sign in before saving a record.");
      return;
    }
    const hasResult = examinations.some((exam) => exam.parameters.some((parameter) => parameter.value.trim()));
    const hasAttachment = examinations.some((exam) => (exam.attachments ?? []).length > 0);
    const unnamedResult = examinations.some((exam) => !hasResultTemplate(exam.diagnosticId)
      && exam.parameters.some((parameter) => parameter.value.trim() && !parameter.name.trim()));
    if (!date) {
      Alert.alert("Choose a date", "Select the examination date.");
      return;
    }
    if (unnamedResult) {
      Alert.alert("Name each result", "Add a parameter name for every custom result you've entered.");
      return;
    }
    if (!examinations.length || (!hasResult && !hasAttachment)) {
      Alert.alert("Add a result or report", "Enter at least one result or attach a report before saving.");
      return;
    }

    const visit: MedicalVisit = {
      id: createId(),
      patientId: user.id,
      patientName: getUserDisplayName(user),
      examinationDate: date,
      facility: facility.trim(),
      notes: notes.trim(),
      examinations,
    };

    setSaving(true);
    try {
      await addVisit(visit);
      router.replace("/(tabs)/records");
    } catch (saveError) {
      Alert.alert("Could not save record", saveError instanceof Error ? saveError.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={19} color={colors.primary} />
        <Text style={styles.backText}>Medical records</Text>
      </Pressable>
      <View>
        <Text style={styles.eyebrow}>NEW MEDICAL RECORD</Text>
        <Text style={styles.title}>Add a record</Text>
        <Text style={styles.subtitle}>Add your results once; they’ll appear in all your family groups.</Text>
      </View>

      <Card style={styles.patientCard}>
        <View style={styles.personIcon}><Ionicons name="person-outline" size={18} color={colors.primary} /></View>
        <View style={styles.patientCopy}>
          <Text style={styles.label}>RECORD FOR</Text>
          <Text style={styles.patientName}>{getUserDisplayName(user)}</Text>
        </View>
        <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
      </Card>

      <View style={styles.field}>
        <Text style={styles.label}>EXAMINATION DATE</Text>
        <DatePickerField value={date} onChange={setDate} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>FACILITY OR CLINIC</Text>
        <TextInput value={facility} onChangeText={setFacility} placeholder="Where was the test done?" placeholderTextColor={colors.muted} style={styles.input} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>EXAMINATION CATEGORY</Text>
        <DropdownField
          label="Examination category"
          value={selectedCategory}
          options={categoryOptions}
          onChange={changeCategory}
        />
      </View>

      {selectedCategory ? (
        <View style={styles.field}>
          <Text style={styles.label}>{selectedCategory.toUpperCase()} EXAMINATION</Text>
          <DropdownField
            label={`Select ${selectedCategory.toLowerCase()} examination`}
            value={examinations[0]?.diagnosticId ?? null}
            options={diagnosticOptions}
            onChange={addExamination}
            searchable
          />
        </View>
      ) : null}

      {examinations.length ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Test and result</Text>
        </View>
      ) : null}

      {examinations.map((exam) => {
        const hasTemplate = hasResultTemplate(exam.diagnosticId);
        return (
          <Card key={exam.id} style={styles.examCard}>
            <View style={styles.examHeader}>
              <View style={styles.examTitleWrap}>
                <Text style={styles.examNumber}>{exam.category.toUpperCase()}</Text>
                <Text style={styles.examTitle}>{exam.name}</Text>
              </View>
            </View>
            {!hasTemplate ? (
              <Text style={styles.customFormHint}>No preset form is available. Add the result parameters shown on your report.</Text>
            ) : null}
            {exam.parameters.map((parameter, parameterIndex) => (
              <View key={parameter.id} style={styles.parameter}>
                {hasTemplate ? (
                  <Text style={styles.parameterLabel}>{parameter.name}</Text>
                ) : (
                  <>
                    <View style={styles.customParameterHeader}>
                      <Text style={styles.parameterLabel}>RESULT {parameterIndex + 1}</Text>
                      <Pressable onPress={() => removeParameter(exam.id, parameter.id)} accessibilityRole="button" accessibilityLabel={`Remove result parameter ${parameterIndex + 1}`}>
                        <Ionicons name="close-circle-outline" size={19} color={colors.muted} />
                      </Pressable>
                    </View>
                    <TextInput
                      value={parameter.name}
                      onChangeText={(name) => updateParameter(exam.id, parameter.id, { name })}
                      placeholder="Parameter name"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                    />
                    <DropdownField
                      label="Result type"
                      value={parameter.type}
                      options={resultTypeOptions}
                      onChange={(type) => {
                        if (isResultValueType(type)) updateParameter(exam.id, parameter.id, { type });
                      }}
                    />
                  </>
                )}
                <TextInput
                  value={parameter.value}
                  onChangeText={(value) => updateParameter(exam.id, parameter.id, { value })}
                  placeholder="Enter result"
                  placeholderTextColor={colors.muted}
                  keyboardType={parameter.type === "numeric" ? "decimal-pad" : "default"}
                  multiline={parameter.type === "longText"}
                  style={[styles.input, parameter.type === "longText" && styles.longInput]}
                />
                {parameter.type === "numeric" ? (
                  <View style={styles.numericExtra}>
                    <TextInput value={parameter.unit} onChangeText={(unit) => updateParameter(exam.id, parameter.id, { unit })} placeholder="Unit" placeholderTextColor={colors.muted} style={[styles.input, styles.unitInput]} />
                    <View style={styles.referenceRow}>
                      <TextInput value={parameter.referenceMin} onChangeText={(referenceMin) => updateParameter(exam.id, parameter.id, { referenceMin })} placeholder="Min reference" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.input, styles.referenceInput]} />
                      <TextInput value={parameter.referenceMax} onChangeText={(referenceMax) => updateParameter(exam.id, parameter.id, { referenceMax })} placeholder="Max reference" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.input, styles.referenceInput]} />
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
            {!hasTemplate ? (
              <Pressable onPress={() => addParameter(exam.id)} style={styles.addParameterButton} accessibilityRole="button">
                <Ionicons name="add" size={17} color={colors.primary} />
                <Text style={styles.addParameterText}>Add result parameter</Text>
              </Pressable>
            ) : null}
            <View style={styles.attachments}>
              <Text style={styles.parameterLabel}>REPORT FILES</Text>
              {(exam.attachments ?? []).map((attachment, attachmentIndex) => (
                <View key={`${attachment.name}-${attachmentIndex}`} style={styles.attachmentRow}>
                  <Ionicons name="document-attach-outline" size={17} color={colors.primary} />
                  <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                  <Pressable onPress={() => removeAttachment(exam.id, attachmentIndex)} accessibilityRole="button" accessibilityLabel={`Remove ${attachment.name}`}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => void addAttachments(exam.id)} style={styles.attachButton}>
                <Ionicons name="attach" size={17} color={colors.primary} />
                <Text style={styles.attachButtonText}>Add PDF or image</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}

      <View style={styles.field}>
        <Text style={styles.label}>NOTES (OPTIONAL)</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Add any useful context" placeholderTextColor={colors.muted} style={[styles.input, styles.notesInput]} multiline />
      </View>

      <Pressable onPress={() => void saveRecord()} disabled={saving} style={[styles.saveButton, saving && styles.disabled]}>
        {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={styles.saveText}>Save medical record</Text></>}
      </Pressable>
    </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 28 },
  backText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  patientCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  personIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  patientCopy: { flex: 1, gap: 3 },
  label: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  patientName: { color: colors.text, fontSize: 13, fontWeight: "800" },
  field: { gap: 6 },
  input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  sectionHint: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  examCard: { gap: 12 },
  examHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  examTitleWrap: { flex: 1, gap: 3 },
  examNumber: { color: colors.primary, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  examTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  customFormHint: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  parameter: { gap: 5 },
  parameterLabel: { color: colors.text, fontSize: 10, fontWeight: "700" },
  customParameterHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addParameterButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 11, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  addParameterText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  longInput: { minHeight: 76, textAlignVertical: "top", paddingTop: 10 },
  numericExtra: { gap: 5 },
  unitInput: { paddingHorizontal: 7, fontSize: 10 },
  referenceRow: { flexDirection: "row", gap: 5 },
  referenceInput: { flex: 1, minWidth: 0, paddingHorizontal: 7, fontSize: 9 },
  attachments: { gap: 7, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.border },
  attachmentRow: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.primaryLight },
  attachmentName: { flex: 1, color: colors.text, fontSize: 10, fontWeight: "700" },
  attachButton: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 11, borderWidth: 1, borderStyle: "dashed", borderColor: colors.primary },
  attachButtonText: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  notesInput: { minHeight: 82, textAlignVertical: "top", paddingTop: 11 },
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: colors.primary },
  disabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
