import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  SafeAreaView, Alert, ScrollView,
} from "react-native";
import { GoalSummary } from "../../lib/goals/types";
import { getGoalSummaries, updateGoal, deleteGoal } from "../services/savingsGoalService";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86_400_000);
}

export default function GoalDetailScreen({ navigation, route }: {
  navigation: { goBack: () => void };
  route: { params: { goalId: string } };
}) {
  const { goalId } = route.params;
  const [goal, setGoal] = useState<GoalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const all = await getGoalSummaries();
    setGoal(all.find(g => g.id === goalId) ?? null);
    setLoading(false);
  }, [goalId]);

  useEffect(() => { load(); }, [load]);

  async function handlePause() {
    if (!goal) return;
    await updateGoal(goalId, { status: goal.status === "paused" ? "active" : "paused" });
    load();
  }

  async function handleDelete() {
    Alert.alert(
      "Delete goal",
      `Are you sure you want to delete "${goal?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteGoal(goalId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  if (loading) return (
    <SafeAreaView style={styles.center}><ActivityIndicator color="#fff" /></SafeAreaView>
  );

  if (!goal) return (
    <SafeAreaView style={styles.center}><Text style={styles.mutedText}>Goal not found.</Text></SafeAreaView>
  );

  const isPaused   = goal.status === "paused";
  const isAchieved = goal.status === "achieved";
  const days       = daysUntil(goal.target_date);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{goal.icon}</Text>
          <Text style={styles.headerName}>{goal.name}</Text>
          {isAchieved && <View style={styles.badgeGreen}><Text style={styles.badgeGreenText}>Achieved ✓</Text></View>}
          {isPaused && <View style={styles.badgeMuted}><Text style={styles.badgeMutedText}>Paused</Text></View>}
        </View>

        {/* Large progress bar */}
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${Math.min(goal.percent_complete, 100)}%` as `${number}%` },
            isAchieved ? styles.progressGreen : goal.on_track ? styles.progressTeal : styles.progressBlue,
          ]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.balanceLarge}>${fmtMoney(goal.current_balance)}</Text>
          <Text style={styles.mutedText}>{Math.round(goal.percent_complete)}% of ${fmtMoney(goal.target_amount)}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Target date</Text>
            <Text style={styles.statValue}>{fmtDate(goal.target_date)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Days remaining</Text>
            <Text style={[styles.statValue, days < 0 && styles.redText]}>{days > 0 ? `${days} days` : days === 0 ? "Today" : "Past due"}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Projected completion</Text>
            <Text style={styles.statValue}>
              {goal.projected_completion_date ? fmtDate(goal.projected_completion_date) : "Not enough data yet"}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Weekly avg growth</Text>
            <Text style={[styles.statValue, goal.weekly_avg_growth > 0 ? styles.greenText : styles.mutedText]}>
              {goal.weekly_avg_growth > 0 ? `+$${fmtMoney(goal.weekly_avg_growth)}` : "—"}
            </Text>
          </View>
          <View style={[styles.statBox, styles.statBoxWide]}>
            <Text style={styles.statLabel}>Status</Text>
            <View style={[styles.statusBadge, goal.on_track ? styles.badgeGreen : styles.badgeOrange]}>
              <Text style={goal.on_track ? styles.badgeGreenText : styles.badgeOrangeText}>
                {isAchieved ? "Achieved" : isPaused ? "Paused" : goal.on_track ? "On track" : "Behind schedule"}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!isAchieved && (
            <TouchableOpacity onPress={handlePause} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>{isPaused ? "Resume goal" : "Pause goal"}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete goal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#18181c" },
  center:         { flex: 1, backgroundColor: "#18181c", alignItems: "center", justifyContent: "center" },
  content:        { padding: 20, gap: 20 },
  header:         { alignItems: "center", gap: 8 },
  headerIcon:     { fontSize: 52 },
  headerName:     { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" },
  progressTrack:  { height: 10, backgroundColor: "#2e2e38", borderRadius: 5, overflow: "hidden" },
  progressFill:   { height: 10, borderRadius: 5 },
  progressGreen:  { backgroundColor: "#4ade80" },
  progressTeal:   { backgroundColor: "#34d399" },
  progressBlue:   { backgroundColor: "#60a5fa" },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLarge:   { color: "#fff", fontSize: 24, fontWeight: "700", fontFamily: "monospace" },
  statsGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox:        { flex: 1, minWidth: "45%", backgroundColor: "#1e1e24", borderWidth: 1, borderColor: "#2e2e38", borderRadius: 14, padding: 14, gap: 4 },
  statBoxWide:    { minWidth: "100%" },
  statLabel:      { color: "#7a7870", fontSize: 10, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  statValue:      { color: "#fff", fontSize: 13, fontWeight: "500" },
  statusBadge:    { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  badgeGreen:     { backgroundColor: "rgba(74,222,128,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeGreenText: { color: "#4ade80", fontSize: 11, fontWeight: "600" },
  badgeOrange:    { backgroundColor: "rgba(251,146,60,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeOrangeText:{ color: "#fb923c", fontSize: 11, fontWeight: "600" },
  badgeMuted:     { backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeMutedText: { color: "#55534e", fontSize: 11 },
  mutedText:      { color: "#7a7870", fontSize: 13 },
  redText:        { color: "#f87171" },
  greenText:      { color: "#4ade80" },
  actions:        { gap: 10, marginTop: 8 },
  actionBtn:      { paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: "#2e2e38", alignItems: "center" },
  actionBtnText:  { color: "#fff", fontSize: 14, fontWeight: "500" },
  deleteBtn:      { paddingVertical: 13, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", alignItems: "center" },
  deleteBtnText:  { color: "#f87171", fontSize: 14, fontWeight: "500" },
});
