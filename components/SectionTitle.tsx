import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";
export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <View style={s.row}><Text style={s.title}>{title}</Text>{action ? <Text style={s.action}>{action}</Text> : null}</View>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  action: { color: colors.primary, fontSize: 13, fontWeight: "600" }
});
