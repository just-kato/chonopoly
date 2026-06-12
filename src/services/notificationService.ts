import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@parkhawkinsproperties.com";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

interface User {
  id: string;
  email: string;
  username: string | null;
}

interface BudgetMeta {
  monthly_limit: number;
  category: { name: string };
  period: { effective_limit: number; amount_spent: number };
}

export function sendBudgetWarningEmail(
  user: User,
  budget: BudgetMeta,
  percentUsed: number
): void {
  const name = user.username ?? "there";
  const cat = budget.category.name;
  const limit = budget.period.effective_limit;
  const spent = budget.period.amount_spent;
  const remaining = Math.max(0, limit - spent);

  resend.emails
    .send({
      from: FROM,
      to: user.email,
      subject: `Heads up — you've used ${Math.round(percentUsed)}% of your ${cat} budget`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px">Spending alert</h2>
          <p>Hey ${name},</p>
          <p>You've used <strong>${Math.round(percentUsed)}%</strong> of your <strong>${cat}</strong> budget this month.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#555">Monthly limit</td><td style="text-align:right;font-weight:600">${fmt(limit)}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Spent so far</td><td style="text-align:right;font-weight:600;color:#dc2626">${fmt(spent)}</td></tr>
            <tr style="border-top:1px solid #e5e7eb">
              <td style="padding:8px 0;font-weight:600">Remaining</td>
              <td style="text-align:right;font-weight:700;color:#16a34a">${fmt(remaining)}</td>
            </tr>
          </table>
          <p style="color:#555;font-size:14px">Keep an eye on your ${cat} spending for the rest of the month.</p>
        </div>
      `,
    })
    .catch(console.error);
}

interface GoalMeta {
  name: string;
  target_amount: number;
  current_balance: number;
}

export function sendBalanceDropEmail(user: User, goal: GoalMeta, dropAmount: number): void {
  const name = user.username ?? "there";
  const previousBalance = goal.current_balance + dropAmount;
  const distanceFromGoal = Math.max(0, goal.target_amount - goal.current_balance);

  resend.emails
    .send({
      from: FROM,
      to: user.email,
      subject: `Your ${goal.name} balance dropped by ${fmt(dropAmount)}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px">Balance drop alert</h2>
          <p>Hey ${name},</p>
          <p>Your <strong>${goal.name}</strong> savings balance decreased.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#555">Previous balance</td><td style="text-align:right;font-weight:600">${fmt(previousBalance)}</td></tr>
            <tr><td style="padding:6px 0;color:#555">New balance</td><td style="text-align:right;font-weight:600;color:#dc2626">${fmt(goal.current_balance)}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Dropped by</td><td style="text-align:right;font-weight:600;color:#dc2626">${fmt(dropAmount)}</td></tr>
            <tr style="border-top:1px solid #e5e7eb">
              <td style="padding:8px 0;font-weight:600">Still needed</td>
              <td style="text-align:right;font-weight:700">${fmt(distanceFromGoal)}</td>
            </tr>
          </table>
          <p style="color:#555;font-size:14px">You're ${fmt(distanceFromGoal)} away from your ${fmt(goal.target_amount)} goal.</p>
        </div>
      `,
    })
    .catch(console.error);
}

export function sendGoalAchievedEmail(user: User, goal: GoalMeta): void {
  const name = user.username ?? "there";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  resend.emails
    .send({
      from: FROM,
      to: user.email,
      subject: `You hit your ${goal.name} goal! 🎉`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px;color:#16a34a">Goal achieved!</h2>
          <p>Hey ${name},</p>
          <p>You reached your <strong>${goal.name}</strong> savings goal — congratulations!</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#555">Target amount</td><td style="text-align:right;font-weight:600">${fmt(goal.target_amount)}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Current balance</td><td style="text-align:right;font-weight:600;color:#16a34a">${fmt(goal.current_balance)}</td></tr>
            <tr style="border-top:1px solid #e5e7eb">
              <td style="padding:8px 0;font-weight:600">Achieved on</td>
              <td style="text-align:right;font-weight:700">${today}</td>
            </tr>
          </table>
          <p style="color:#555;font-size:14px">Time to set your next goal.</p>
        </div>
      `,
    })
    .catch(console.error);
}

export function sendBudgetOverEmail(
  user: User,
  budget: BudgetMeta,
  amountOver: number
): void {
  const name = user.username ?? "there";
  const cat = budget.category.name;
  const limit = budget.period.effective_limit;
  const spent = budget.period.amount_spent;

  resend.emails
    .send({
      from: FROM,
      to: user.email,
      subject: `You're over your ${cat} budget this month`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px;color:#dc2626">Over budget</h2>
          <p>Hey ${name},</p>
          <p>You've exceeded your <strong>${cat}</strong> budget by <strong style="color:#dc2626">${fmt(amountOver)}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#555">Monthly limit</td><td style="text-align:right;font-weight:600">${fmt(limit)}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Total spent</td><td style="text-align:right;font-weight:600;color:#dc2626">${fmt(spent)}</td></tr>
            <tr style="border-top:1px solid #e5e7eb">
              <td style="padding:8px 0;font-weight:600;color:#dc2626">Over by</td>
              <td style="text-align:right;font-weight:700;color:#dc2626">${fmt(amountOver)}</td>
            </tr>
          </table>
          <p style="color:#555;font-size:14px">Consider reviewing your recent ${cat} transactions or adjusting your limit.</p>
        </div>
      `,
    })
    .catch(console.error);
}
