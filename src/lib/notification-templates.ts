import { formatXAF } from "@/lib/format";

export type TxNotification = { title: string; body: string; url: string; tag?: string };

/** Short, native-app style push templates for transaction updates. */
export const txNotification = {
  depositApproved: (amount: number): TxNotification => ({
    title: "Deposit successful",
    body: `Your deposit of ${formatXAF(amount)} has been approved and added to your balance.`,
    url: "/dashboard/wallet",
    tag: "deposit",
  }),
  depositRejected: (amount: number): TxNotification => ({
    title: "Deposit rejected",
    body: `Your deposit of ${formatXAF(amount)} could not be verified. Please try again.`,
    url: "/dashboard/wallet",
    tag: "deposit",
  }),
  withdrawalApproved: (amount: number): TxNotification => ({
    title: "Withdrawal approved",
    body: `Your withdrawal of ${formatXAF(amount)} has been approved and is being processed.`,
    url: "/dashboard/wallet",
    tag: "withdrawal",
  }),
  withdrawalPaid: (amount: number): TxNotification => ({
    title: "Withdrawal paid",
    body: `Your withdrawal of ${formatXAF(amount)} has been sent to your account.`,
    url: "/dashboard/wallet",
    tag: "withdrawal",
  }),
  withdrawalRejected: (amount: number): TxNotification => ({
    title: "Withdrawal rejected",
    body: `Your withdrawal of ${formatXAF(amount)} was rejected and the funds were returned to your balance.`,
    url: "/dashboard/wallet",
    tag: "withdrawal",
  }),
};
