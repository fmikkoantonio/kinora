import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export interface DropdownOption {
  label: string;
  value: string | null;
  description?: string;
}

interface DropdownFieldProps {
  label: string;
  value: string | null;
  options: DropdownOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  searchable?: boolean;
}

export function DropdownField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  searchable = false,
}: DropdownFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const visibleOptions = options.filter((option) => (
    `${option.label} ${option.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())
  ));

  return (
    <>
      <Pressable
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        disabled={disabled}
        style={[styles.trigger, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption?.label ?? "Select"}`}
        accessibilityState={{ disabled, expanded: open }}
      >
        <Text style={[styles.triggerText, !selectedOption && styles.placeholder]}>
          {selectedOption?.label ?? "Select"}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close options"
          />
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>{label}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close dropdown"
              >
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            {searchable ? (
              <View style={styles.search}>
                <Ionicons name="search" size={17} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={`Search ${label.toLowerCase()}`}
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  accessibilityLabel={`Search ${label.toLowerCase()}`}
                  autoCapitalize="none"
                />
              </View>
            ) : null}
            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              {visibleOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value ?? "all"}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      ) : null}
                    </View>
                    {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
              {visibleOptions.length === 0 ? (
                <Text style={styles.noResults}>No matching family members.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  placeholder: { color: colors.muted },
  disabled: { opacity: 0.6 },
  overlay: { flex: 1, backgroundColor: "rgba(25, 42, 58, 0.35)", justifyContent: "center", padding: 22 },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "80%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  dialogHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dialogTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  options: { flexGrow: 0 },
  search: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 },
  option: {
    minHeight: 48,
    borderRadius: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionCopy: { flex: 1, gap: 2 },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionText: { color: colors.text, fontSize: 13 },
  optionTextSelected: { color: colors.primary, fontWeight: "800" },
  optionDescription: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  noResults: { color: colors.muted, fontSize: 12, padding: 12, textAlign: "center" },
});
