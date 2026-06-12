import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { currentPeriod } from "../services/budgetService";
import { supabase } from "../lib/supabase";

type BudgetSummary = {
  budget_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  monthly_limit: number;
  effective_limit: number;
  amount_spent: number;
  amount_remaining: number;
  percent_used: number;
  over_budget: boolean;
  period: string;
};

type RootStackParamList = {
  BudgetList: undefined;
  CreateBudget: undefined;
  BudgetDetail: { budgetId: string; summary: BudgetSummary };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BudgetList">;
};

function ProgressBar({ percent, over }: { percent: number; over: boolean }) {
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(percent, 100)}%` as `${number}%`,
            backgroundColor: over ? "#ef4444" : percent >= 80 ? "#f97316" : "#34d399",
          },
        ]}
      />
    </View>
  );
}

function BudgetCard({
  item,
  onPress,
}: {
  item: BudgetSummary;
  onPress: () => void;
}) {
  const over = item.over_budget;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: item.category_color + "22" }]}>
          <Text style={styles.badgeIcon}>{item.category_icon}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.catName}>{item.category_name}</Text>
          <Text style={[styles.remaining, over && styles.redText]}>
            {over
              ? `$${(item.amount_spent - item.effective_limit).toFixed(2)} over limit`
              : `$${item.amount_remaining.toFixed(2)} remaining`}
          </Text>
        </View>
        <Text style={[styles.pct, over && styles.redText]}>
          {Math.round(item.percent_used)}%
        </Text>
      </View>
      <ProgressBar percent={item.percent_used} over={over} />
      <Text style={styles.footer}>
        <Text style={styles.spent}>${item.amount_spent.toFixed(2)}</Text>
        <Text style={styles.limit}> / ${item.effective_limit.toFixed(2)}</Text>
      </Text>
    </Pressable>
  );
}

export default function BudgetListScreen({ navigation }: Props) {
  const [summaries, setSummaries] = useState<BudgetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("pay_cycle_start_day")
          .eq("id", user.id)
          .single();
        const period = currentPeriod(profile?.pay_cycle_start_day ?? 1);
        const res = await fetch(`/api/budget/summary?period=${period}`);
        const json = await res.json();
        setSummaries(json.summaries ?? []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
    return navigation.addListener("focus", () => load(true));
  }, [load, navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("CreateBudget")}
          style={{ paddingHorizontal: 16 }}
        >
          <Text style={{ fontSize: 26, color: "#34d399", lineHeight: 30 }}>+</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#34d399" size="large" />
      </View>
    );
  }

  if (!summaries.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>💰</Text>
        <Text style={styles.emptyTitle}>No budgets yet</Text>
        <Text style={styles.emptySub}>Tap + to create your first budget.</Text>
      </View>
    );
  }

  const over = summaries.filter((s) => s.over_budget);
  const ok = summaries.filter((s) => !s.over_budget);

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={[]}
      renderItem={null}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(true);
          }}
          tintColor="#34d399"
        />
      }
      ListHeaderComponent={
        <>
          {over.length > 0 && (
            <>
              <Text style={styles.section}>OVER BUDGET</Text>
              {over.map((s) => (
                <BudgetCard
                  key={s.budget_id}
                  item={s}
                  onPress={() =>
                    navigation.navigate("BudgetDetail", {
                      budgetId: s.budget_id,
                      summary: s,
                    })
                  }
                />
              ))}
            </>
          )}
          <Text style={styles.section}>ON TRACK</Text>
          {ok.map((s) => (
            <BudgetCard
              key={s.budget_id}
              item={s}
              onPress={() =>
                navigation.navigate("BudgetDetail", {
                  budgetId: s.budget_id,
                  summary: s,
                })
              }
            />
          ))}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#18181c" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#18181c" },
  section: { fontSize: 10, fontWeight: "600", color: "#7a7870", letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: "#1e1e24", borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#2e2e38" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  badgeIcon: { fontSize: 20 },
  meta: { flex: 1 },
  catName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  remaining: { fontSize: 12, color: "#7a7870", marginTop: 2 },
  redText: { color: "#ef4444" },
  pct: { fontSize: 13, fontWeight: "600", color: "#c8c5bc" },
  track: { height: 6, backgroundColor: "#2e2e38", borderRadius: 99, overflow: "hidden", marginBottom: 8 },
  fill: { height: "100%", borderRadius: 99 },
  footer: { fontSize: 12 },
  spent: { color: "#c8c5bc" },
  limit: { color: "#7a7870" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#7a7870" },
});
