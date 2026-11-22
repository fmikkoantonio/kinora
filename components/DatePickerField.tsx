import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { formatMedicalDate } from "@/lib/formatMedicalDate";

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3])
    ? date
    : null;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerField({ value, onChange }: DatePickerFieldProps) {
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState(() => parseDate(value) ?? new Date());
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = Array.from({ length: 42 }, (_, index) =>
    new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1),
  );
  const selectedDate = parseDate(value);

  function showPicker() {
    setMonth(parseDate(value) ?? new Date());
    setVisible(true);
  }

  function moveMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function selectDate(date: Date) {
    onChange(formatDate(date));
    setVisible(false);
  }

  return (
    <>
      <Pressable
        onPress={showPicker}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={value ? `Examination date ${formatMedicalDate(value)}` : "Choose examination date"}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatMedicalDate(value) : "Select examination date"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVisible(false)}
            accessibilityLabel="Close date picker"
          />
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              <Pressable
                onPress={() => moveMonth(-1)}
                style={styles.monthButton}
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </Text>
              <Pressable
                onPress={() => moveMonth(1)}
                style={styles.monthButton}
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.grid}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <Text key={day} style={styles.weekday}>{day}</Text>
              ))}
              {days.map((date) => {
                const dateValue = formatDate(date);
                const isSelected = selectedDate !== null && dateValue === value;
                const isCurrentMonth = date.getMonth() === month.getMonth();
                return (
                  <Pressable
                    key={dateValue}
                    onPress={() => selectDate(date)}
                    style={[styles.dayButton, isSelected && styles.selectedDay]}
                    accessibilityRole="button"
                    accessibilityLabel={date.toLocaleDateString()}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[
                      styles.dayText,
                      !isCurrentMonth && styles.outsideMonth,
                      isSelected && styles.selectedDayText,
                    ]}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => setVisible(false)} style={styles.actionButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => selectDate(new Date())} style={styles.actionButton}>
                <Text style={styles.todayText}>Today</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 48, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  value: { color: colors.text, fontSize: 14 },
  placeholder: { color: "#9AA7B3" },
  modalRoot: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(24, 43, 61, 0.3)" },
  calendar: { width: "100%", maxWidth: 360, borderRadius: 18, backgroundColor: "#fff", padding: 16, gap: 12, elevation: 8 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primaryLight },
  monthTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.2857%", textAlign: "center", color: colors.muted, fontSize: 11, fontWeight: "700", paddingVertical: 8 },
  dayButton: { width: "14.2857%", height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  selectedDay: { backgroundColor: colors.primary },
  dayText: { color: colors.text, fontSize: 12 },
  outsideMonth: { color: "#B7C0C9" },
  selectedDayText: { color: "#fff", fontWeight: "800" },
  actions: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 8 },
  cancelText: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  todayText: { color: colors.primary, fontWeight: "800", fontSize: 12 },
});
