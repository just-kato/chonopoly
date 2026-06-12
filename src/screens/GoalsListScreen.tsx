import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from "react-native";
import { GoalSummary } from "../../lib/goals/types";
import { getGoalSummaries, syncGoal, updateGoal, deleteGoal } from "../services/savingsGoalService";

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86_400_000);
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function GoalCard({ goal, onRefresh }: { goal: GoalSummary; onRefresh: () => void }) {
  const isPaused   = goal.status === "paused";
  const isAchieved = goal.status === "achieved";
  const days       = daysUntil(goal.target_date);

  async function handlePause() {
    await updateGoal(goal.id, { status: isPaused ? "active" : "paused" });
    onRefresh();
  }

  async function handleSync() {
    await syncGoal(goal.id);
    onRefresh();
  }

  async function handleDelete() {
    await deleteGoal(goal.id);
    onRefresh();
  }

  return (
    <View style={[styles.card, isPaused && styles.cardDimmed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.goalIcon}>{goal.icon}</Text>
        <View style={styles.cardTitleBlock}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.goalName}>{goal.name}</Text>
            {isAchieved && <View style={styles.badgeGreen}><Text style={styles.badgeGreenText}>Achieved ✓</Text></View>}
            {isPaused && <View style={styles.badgeMuted}><Text style={styles.badgeMutedText}>Paused</Text></View>}
            {!isAchieved && !isPaused && (
              <View style={goal.on_track ? styles.badgeGreen : styles.badgeOrange}>
                <Text style={goal.on_track ? styles.badgeGreenText : styles.badgeOrangeText}>
                  {goal.on_track ? "On track" : "Behind"}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.balanceText}>
            ${fmtMoney(goal.current_balance)} <Text style={styles.mutedText}>/ ${fmtMoney(goal.target_amount)}</Text>
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={handleSync} style={styles.actionBtn}><Text style={styles.actionIcon}>↺</Text></TouchableOpacity>
          <TouchableOpacity onPress={handlePause} style={styles.actionBtn}><Text style={styles.actionIcon}>{isPaused ? "▶" : "⏸"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}><Text style={[styles.actionIcon, styles.deleteIcon]}>✕</Text></TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[
          styles.progressFill,
          { width: `${Math.min(goal.percent_complete, 100)}%` as `${number}%` },
          isAchieved ? styles.progressGreen : goal.percent_complete >= 75 ? styles.progressTeal : styles.progressBlue,
        ]} />
      </View>

      <View style={styles.progressMeta}>
        <Text style={styles.mutedText}>{Math.round(goal.percent_complete)}% saved</Text>
        <Text style={styles.mutedText}>
          {isAchieved ? "Goal reached" : days > 0 ? `${days}d until ${fmtDate(goal.target_date)}` : "Past target date"}
        </Text>
      </View>

      {!isAchieved && (
        <View style={styles.projectionRow}>
          <Text style={styles.projectionText}>
            {goal.projected_completion_date
              ? `Est. ${fmtDate(goal.projected_completion_date)}`
              : "Not enough data yet"}
          </Text>
          {goal.weekly_avg_growth > 0 && (
            <Text style={styles.projectionText}>+${fmtMoney(goal.weekly_avg_growth)}/wk</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function GoalsListScreen({ navigation }: { navigation: { navigate: (s: string, p?: object) => void } }) {
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGoals(await getGoalSummaries()); } catch { /* handled below */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator color="#fff" />
    </SafeAreaView>
  );

  const activeGoals   = goals.filter(g => g.status !== "achieved");
  const achievedGoals = goals.filter(g => g.status === "achieved");

  if (goals.length === 0) return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.emptyIcon}>🎯</Text>
      <Text style={styles.emptyTitle}>No savings goals yet</Text>
      <Text style={styles.emptySubtitle}>Link a Plaid account to a goal and track your progress automatically.</Text>
      <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate("CreateGoal", { onSaved: load })}>
        <Text style={styles.ctaBtnText}>Create your first goal</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={activeGoals}
        keyExtractor={g => g.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <GoalCard goal={item} onRefresh={load} />}
        ListFooterComponent={
          achievedGoals.length > 0 ? (
            <View style={styles.achievedSection}>
              <Text style={styles.sectionLabel}>ACHIEVED</Text>
              {achievedGoals.map(g => <GoalCard key={g.id} goal={g} onRefresh={load} />)}
            </View>
          ) : null
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("CreateGoal", { onSaved: load })}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#18181c" },
  center:          { flex: 1, backgroundColor: "#18181c", alignItems: "center", justifyContent: "center", padding: 24 },
  list:            { padding: 16, gap: 12 },
  card:            { backgroundColor: "#1e1e24", borderWidth: 1, borderColor: "#2e2e38", borderRadius: 16, padding: 16, gap: 12 },
  cardDimmed:      { opacity: 0.5 },
  cardHeader:      { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  goalIcon:        { fontSize: 28, lineHeight: 36 },
  cardTitleBlock:  { flex: 1, gap: 2 },
  cardTitleRow:    { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  goalName:        { color: "#fff", fontSize: 14, fontWeight: "600" },
  balanceText:     { color: "#fff", fontSize: 12, fontFamily: "monospace" },
  mutedText:       { color: "#7a7870", fontSize: 11 },
  cardActions:     { flexDirection: "row", gap: 8 },
  actionBtn:       { padding: 4 },
  actionIcon:      { color: "#55534e", fontSize: 14 },
  deleteIcon:      { color: "#55534e" },
  progressTrack:   { height: 6, backgroundColor: "#2e2e38", borderRadius: 3, overflow: "hidden" },
  progressFill:    { height: 6, borderRadius: 3 },
  progressGreen:   { backgroundColor: "#4ade80" },
  progressTeal:    { backgroundColor: "#34d399" },
  progressBlue:    { backgroundColor: "#60a5fa" },
  progressMeta:    { flexDirection: "row", justifyContent: "space-between" },
  projectionRow:   { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#2e2e38", paddingTop: 8 },
  projectionText:  { color: "#55534e", fontSize: 10 },
  badgeGreen:      { backgroundColor: "rgba(74,222,128,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  badgeGreenText:  { color: "#4ade80", fontSize: 10 },
  badgeOrange:     { backgroundColor: "rgba(251,146,60,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  badgeOrangeText: { color: "#fb923c", fontSize: 10 },
  badgeMuted:      { backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  badgeMutedText:  { color: "#55534e", fontSize: 10 },
  achievedSection: { marginTop: 24, gap: 12 },
  sectionLabel:    { color: "#55534e", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, marginBottom: 4, paddingHorizontal: 4 },
  emptyIcon:       { fontSize: 48, marginBottom: 16 },
  emptyTitle:      { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubtitle:   { color: "#7a7870", fontSize: 14, textAlign: "center", marginBottom: 24 },
  ctaBtn:          { backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  ctaBtnText:      { color: "#000", fontWeight: "700", fontSize: 14 },
  fab:             { position: "absolute", bottom: 32, right: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText:         { color: "#000", fontSize: 28, lineHeight: 32, fontWeight: "300" },
});
