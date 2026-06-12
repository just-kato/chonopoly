import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl,
  StyleSheet, Text, View,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { BudgetSummary } from "../../lib/budget/types";
import { currentPeriod, getPeriodForDate } from "../../lib/budget/budgetService";
import { supabase } from "../lib/supabase"; // your existing supabase client

// Transactions are pulled from your EXISTING transactions table.
// Tapping a transaction navigates to your EXISTING TransactionDetail screen.

type RootStackParamList = {
  BudgetList: undefined;
  BudgetDetail: { budgetId: string; summary: BudgetSummary };
  TransactionDetail: { transaction: Transaction }; // your existing screen
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BudgetDetail">;
  route: RouteProp<RootStackParamList, "BudgetDetail">;
};

interface Transaction {
  id: string;
  merchant_name: string;
  amount: number;
  date: string;
  category_id: string;
}

function ProgressBar({ percent, overBudget }: { percent: number; overBudget: boolean }) {
  return (
    <View style={styles.track}>
      <View style={[
        styles.fill,
        {
          width: `${Math.min(percent, 100)}%` as `${number}%`,
          backgroundColor: overBudget ? "#ef4444" : percent >= 80 ? "#f97316" : "#34d399",
        },
      ]} />
    </View>
  );
}

export default function BudgetDetailScreen({ navigation, route }: Props) {
  const { budgetId, summary: initial } = route.params;
  const [summary, setSummary] = useState<BudgetSummary>(initial);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("pay_cycle_start_day")
        .eq("id", user.id)
        .single();
      const startDay = profile?.pay_cycle_start_day ?? 1;
      const period = currentPeriod(startDay);

      // Calculate period bounds
      const [y, m] = period.split("-").map(Number);
      const periodStart = new Date(y, m - 1, startDay);
      const periodEnd = new Date(y, m, startDay - 1);
      const fmt = (d: Date) => d.toISOString().split("T")[0];

      // Get the category for this budget
      const { data: budget } = await supabase
        .from("budgets")
        .select("category_id")
        .eq("id", budgetId)
        .single();

      if (!budget) return;

      // Pull from the EXISTING transactions table
      const { data: txs } = await supabase
        .from("transactions")
        .select("id, merchant_name, amount, date, category_id")
        .eq("user_id", user.id)
        .eq("category_id", budget.category_id)
        .gte("date", fmt(periodStart))
        .lte("date", fmt(periodEnd))
        .gt("amount", 0)
        .order("date", { ascending: false });

      setTransactions(txs ?? []);

      // Refresh summary
      const res = await fetch(`/api/budget/summary?period=${period}`);
      const json = await res.json();
      const updated = (json.summaries ?? []).find((s: BudgetSummary) => s.budget_id === budgetId);
      if (updated) setSummary(updated);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [budgetId]);

  useEffect(() => { load(); }, [load]);

  const { category_icon, category_name, category_color, amount_spent, effective_limit, percent_used, over_budget } = summary;

  if (loading) return <View style={styles.center}><ActivityIndicator color="#34d399" size="large" /></View>;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={transactions}
      keyExtractor={(t) => t.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#34d399" />}
      ListHeaderComponent={
        <View>
          {/* Budget card */}
          <View style={[styles.headerCard, { borderColor: over_budget ? "#ef4444" : category_color + "55" }]}>
            <View style={[styles.iconBadge, { backgroundColor: category_color + "22" }]}>
              <Text style={styles.icon}>{category_icon}</Text>
            </View>
            <Text style={styles.headerName}>{category_name}</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Spent</Text>
                <Text style={[styles.statValue, over_budget && { color: "#ef4444" }]}>${amount_spent.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Limit</Text>
                <Text style={styles.statValue}>${effective_limit.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{over_budget ? "Over by" : "Left"}</Text>
                <Text style={[styles.statValue, { color: over_budget ? "#ef4444" : "#34d399" }]}>
                  ${over_budget
                    ? (amount_spent - effective_limit).toFixed(2)
                    : Math.max(0, effective_limit - amount_spent).toFixed(2)}
                </Text>
              </View>
            </View>

            <ProgressBar percent={percent_used} overBudget={over_budget} />
            <Text style={styles.pctLabel}>{Math.round(percent_used)}% used</Text>
          </View>

          <Text style={styles.section}>TRANSACTIONS THIS PERIOD</Text>
          {transactions.length === 0 && (
            <Text style={styles.empty}>No transactions this period.</Text>
          )}
        </View>
      }
      renderItem={({ item: tx }) => (
        // Taps into your EXISTING TransactionDetail screen — not rebuilt here
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.navigate("TransactionDetail", { transaction: tx })}
        >
          <View style={styles.rowMeta}>
            <Text style={styles.merchant}>{tx.merchant_name}</Text>
            <Text style={styles.date}>
              {new Date(tx.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          </View>
          <Text style={styles.amount}>${tx.amount.toFixed(2)}</Text>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#18181c" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#18181c" },

  headerCard: { backgroundColor: "#1e1e24", borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1 },
  iconBadge: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  icon: { fontSize: 24 },
  headerName: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 18 },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 10, color: "#7a7870", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: "#fff" },
  divider: { width: 1, height: 32, backgroundColor: "#2e2e38" },
  track: { height: 8, backgroundColor: "#2e2e38", borderRadius: 99, overflow: "hidden", marginBottom: 6 },
  fill: { height: "100%", borderRadius: 99 },
  pctLabel: { fontSize: 11, color: "#7a7870", textAlign: "right" },

  section: { fontSize: 10, fontWeight: "600", color: "#7a7870", letterSpacing: 1.2, marginBottom: 8 },
  empty: { fontSize: 14, color: "#55534e", textAlign: "center", paddingVertical: 20 },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 4 },
  rowMeta: { flex: 1 },
  merchant: { fontSize: 15, fontWeight: "500", color: "#fff" },
  date: { fontSize: 12, color: "#7a7870", marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "600", color: "#fff" },
  sep: { height: 1, backgroundColor: "#2e2e38" },
});
