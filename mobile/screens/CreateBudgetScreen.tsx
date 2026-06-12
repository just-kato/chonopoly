import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase"; // your existing supabase client

// Uses your EXISTING categories table — no category creation here.

type RootStackParamList = { BudgetList: undefined; CreateBudget: undefined };
type Props = { navigation: NativeStackNavigationProp<RootStackParamList, "CreateBudget"> };

interface Category { id: string; name: string; color: string; icon: string }

export default function CreateBudgetScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [rollover, setRollover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Fetch from your existing categories table
      const { data } = await supabase
        .from("categories")
        .select("id, name, color, icon")
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order("name");
      setCategories(data ?? []);
    }
    loadCategories();
  }, []);

  async function save() {
    if (!selectedCategoryId) { Alert.alert("Select a category"); return; }
    const limit = parseFloat(monthlyLimit);
    if (isNaN(limit) || limit <= 0) { Alert.alert("Enter a valid monthly limit"); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("budgets")
        .upsert(
          { user_id: user.id, category_id: selectedCategoryId, monthly_limit: limit, rollover_enabled: rollover },
          { onConflict: "user_id,category_id" }
        );

      if (error) throw error;
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const selected = categories.find((c) => c.id === selectedCategoryId);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>

        <Text style={styles.label}>Category</Text>
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          renderItem={({ item: cat }) => (
            <Pressable
              onPress={() => setSelectedCategoryId(cat.id)}
              style={[
                styles.chip,
                selectedCategoryId === cat.id && { borderColor: cat.color, backgroundColor: cat.color + "22" },
              ]}
            >
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text style={[styles.chipLabel, selectedCategoryId === cat.id && { color: "#fff" }]}>{cat.name}</Text>
            </Pressable>
          )}
        />

        <Text style={[styles.label, { marginTop: 28 }]}>Monthly limit</Text>
        <View style={styles.inputRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.input}
            value={monthlyLimit}
            onChangeText={setMonthlyLimit}
            placeholder="0.00"
            placeholderTextColor="#55534e"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Rollover unused budget</Text>
            <Text style={styles.toggleSub}>Unspent balance carries to next month</Text>
          </View>
          <Switch value={rollover} onValueChange={setRollover} trackColor={{ false: "#2e2e38", true: "#34d399" }} thumbColor="#fff" />
        </View>

        <Pressable
          onPress={save}
          disabled={saving || !selectedCategoryId}
          style={[styles.saveBtn, (saving || !selectedCategoryId) && { opacity: 0.45 }]}
        >
          {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save budget</Text>}
        </Pressable>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#18181c", padding: 20 },
  label: { fontSize: 11, fontWeight: "600", color: "#7a7870", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  categoryRow: { gap: 8, paddingBottom: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: "#2e2e38", backgroundColor: "#1e1e24" },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 13, color: "#7a7870" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dollar: { fontSize: 18, color: "#7a7870" },
  input: { flex: 1, backgroundColor: "#1e1e24", borderWidth: 1, borderColor: "#2e2e38", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#fff" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, paddingVertical: 16, borderTopWidth: 1, borderColor: "#2e2e38" },
  toggleLabel: { fontSize: 15, color: "#fff", fontWeight: "500" },
  toggleSub: { fontSize: 12, color: "#7a7870", marginTop: 2 },
  saveBtn: { marginTop: 32, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
});
