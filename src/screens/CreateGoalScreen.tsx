import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Platform,
} from "react-native";
import { createGoal } from "../services/savingsGoalService";

const ICONS = ["🎯", "🏠", "🚗", "✈️", "💍", "🎓", "💻", "🌴", "🏋️", "💰", "🛒", "🎁"];

interface PlaidAccount {
  account_id: string;
  item_id: string;
  name: string;
  institution_name: string | null;
  subtype: string | null;
  balances: { current: number | null };
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CreateGoalScreen({ navigation, route }: {
  navigation: { goBack: () => void };
  route: { params?: { onSaved?: () => void; accounts?: PlaidAccount[] } };
}) {
  const { onSaved, accounts = [] } = route.params ?? {};

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = new Date().toISOString().split("T")[0];

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Enter a goal name."); return; }
    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid target amount."); return; }
    if (!targetDate || targetDate <= minDate) { setError("Target date must be in the future."); return; }
    if (!selectedAccountId || !selectedItemId) { setError("Select an account."); return; }

    setSaving(true);
    try {
      await createGoal({
        name: name.trim(),
        icon,
        target_amount: amount,
        target_date: targetDate,
        plaid_account_id: selectedAccountId,
        plaid_item_id: selectedItemId,
      });
      onSaved?.();
      navigation.goBack();
    } catch {
      setError("Failed to create goal. Please try again.");
    }
    setSaving(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New savings goal</Text>

        {/* Icon picker */}
        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconRow}>
          {ICONS.map(e => (
            <TouchableOpacity
              key={e}
              onPress={() => setIcon(e)}
              style={[styles.iconBtn, icon === e && styles.iconBtnSelected]}
            >
              <Text style={styles.iconEmoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <Text style={styles.label}>Goal name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Emergency fund"
          placeholderTextColor="#55534e"
          style={styles.input}
        />

        {/* Target amount */}
        <Text style={styles.label}>Target amount</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputPrefix}>$</Text>
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="0.00"
            placeholderTextColor="#55534e"
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1 }]}
          />
        </View>

        {/* Target date */}
        <Text style={styles.label}>Target date</Text>
        <TextInput
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#55534e"
          style={styles.input}
        />

        {/* Account picker */}
        <Text style={styles.label}>Linked account</Text>
        {accounts.length === 0 ? (
          <Text style={styles.noAccountsText}>No accounts connected. Add a bank first.</Text>
        ) : (
          accounts.map(a => (
            <TouchableOpacity
              key={a.account_id}
              onPress={() => { setSelectedAccountId(a.account_id); setSelectedItemId(a.item_id); }}
              style={[styles.accountRow, selectedAccountId === a.account_id && styles.accountRowSelected]}
            >
              <View>
                <Text style={styles.accountName}>{a.name}</Text>
                <Text style={styles.accountSub}>{a.institution_name} · {a.subtype}</Text>
              </View>
              <Text style={styles.accountBalance}>${fmtMoney(a.balances.current ?? 0)}</Text>
            </TouchableOpacity>
          ))
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.btnRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Create goal"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: "#18181c" },
  content:             { padding: 20, gap: 12 },
  heading:             { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  label:               { color: "#7a7870", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, marginTop: 4 },
  iconRow:             { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  iconBtn:             { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#2e2e38", alignItems: "center", justifyContent: "center" },
  iconBtnSelected:     { borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.08)" },
  iconEmoji:           { fontSize: 22 },
  input:               { backgroundColor: "#111115", borderWidth: 1, borderColor: "#2e2e38", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontSize: 14 },
  inputRow:            { flexDirection: "row", alignItems: "center", gap: 8 },
  inputPrefix:         { color: "#7a7870", fontSize: 16 },
  accountRow:          { backgroundColor: "#1e1e24", borderWidth: 1, borderColor: "#2e2e38", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accountRowSelected:  { borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" },
  accountName:         { color: "#fff", fontSize: 13, fontWeight: "500" },
  accountSub:          { color: "#7a7870", fontSize: 11, marginTop: 2 },
  accountBalance:      { color: "#fff", fontSize: 13, fontFamily: "monospace" },
  noAccountsText:      { color: "#55534e", fontSize: 13 },
  errorText:           { color: "#f87171", fontSize: 13, marginTop: 4 },
  btnRow:              { flexDirection: "row", gap: 12, marginTop: 12 },
  cancelBtn:           { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#2e2e38", alignItems: "center" },
  cancelBtnText:       { color: "#7a7870", fontSize: 14 },
  saveBtn:             { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#fff", alignItems: "center" },
  saveBtnDisabled:     { opacity: 0.4 },
  saveBtnText:         { color: "#000", fontSize: 14, fontWeight: "700" },
});
