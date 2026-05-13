import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "fr";

const DICT = {
  en: {
    "nav.home": "Home",
    "nav.invest": "Invest",
    "nav.wallet": "Wallet",
    "nav.profile": "Profile",
    "nav.admin": "Admin",
    "common.loading": "Loading…",
    "common.deposit": "Deposit",
    "common.withdraw": "Withdraw",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.back": "Back",
    "common.amount": "Amount (XAF)",
    "common.method": "Method",
    "common.date": "Date",
    "common.status": "Status",
    "wallet.title": "Wallet",
    "wallet.subtitle": "All your money movements in one place.",
    "wallet.balance": "Available balance",
    "wallet.filter.all": "All",
    "wallet.filter.deposits": "Deposits",
    "wallet.filter.withdrawals": "Withdrawals",
    "wallet.filter.profits": "Profits",
    "wallet.empty": "No transactions yet.",
    "deposit.title": "Deposit funds",
    "deposit.subtitle": "Choose a method, send the funds, then submit your screenshot.",
    "deposit.sendTo": "Send payment to",
    "deposit.accountName": "Account name",
    "deposit.accountNumber": "Account / Number",
    "deposit.amountToSend": "Amount to send (XAF)",
    "deposit.enterAmount": "Enter an amount →",
    "deposit.instructions": "Instructions",
    "deposit.proof": "Payment screenshot",
    "deposit.proofPlaceholder": "Tap to upload your proof of payment",
    "deposit.proofHint": "A clear screenshot of the transfer is the only thing required.",
    "deposit.submit": "Submit deposit",
    "deposit.submitting": "Submitting…",
    "deposit.submitted": "Deposit submitted — pending review",
    "withdraw.title": "Withdraw funds",
    "withdraw.subtitle": "Funds are sent within 24h after admin review.",
    "withdraw.available": "Available",
    "withdraw.accountName": "Account name",
    "withdraw.accountNumber": "Account / Phone / Wallet",
    "withdraw.submit": "Request withdrawal",
    "withdraw.submitted": "Withdrawal request submitted",
    "auth.signIn": "Sign in",
    "auth.signUp": "Create account",
    "auth.welcomeBack": "Welcome back",
    "auth.createAcc": "Create your account",
    "auth.forgot": "Forgot password?",
    "lang.label": "Language",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.invest": "Investir",
    "nav.wallet": "Portefeuille",
    "nav.profile": "Profil",
    "nav.admin": "Admin",
    "common.loading": "Chargement…",
    "common.deposit": "Dépôt",
    "common.withdraw": "Retrait",
    "common.cancel": "Annuler",
    "common.submit": "Envoyer",
    "common.back": "Retour",
    "common.amount": "Montant (XAF)",
    "common.method": "Méthode",
    "common.date": "Date",
    "common.status": "Statut",
    "wallet.title": "Portefeuille",
    "wallet.subtitle": "Tous vos mouvements d'argent au même endroit.",
    "wallet.balance": "Solde disponible",
    "wallet.filter.all": "Tout",
    "wallet.filter.deposits": "Dépôts",
    "wallet.filter.withdrawals": "Retraits",
    "wallet.filter.profits": "Profits",
    "wallet.empty": "Aucune transaction pour le moment.",
    "deposit.title": "Faire un dépôt",
    "deposit.subtitle": "Choisissez une méthode, envoyez les fonds, puis téléchargez votre capture.",
    "deposit.sendTo": "Envoyer le paiement à",
    "deposit.accountName": "Nom du compte",
    "deposit.accountNumber": "Compte / Numéro",
    "deposit.amountToSend": "Montant à envoyer (XAF)",
    "deposit.enterAmount": "Entrez un montant →",
    "deposit.instructions": "Instructions",
    "deposit.proof": "Capture du paiement",
    "deposit.proofPlaceholder": "Appuyez pour téléverser votre preuve",
    "deposit.proofHint": "Seule une capture claire du transfert est requise.",
    "deposit.submit": "Envoyer le dépôt",
    "deposit.submitting": "Envoi…",
    "deposit.submitted": "Dépôt soumis — en attente de validation",
    "withdraw.title": "Retirer des fonds",
    "withdraw.subtitle": "Les fonds sont envoyés sous 24h après vérification.",
    "withdraw.available": "Disponible",
    "withdraw.accountName": "Nom du compte",
    "withdraw.accountNumber": "Compte / Téléphone / Wallet",
    "withdraw.submit": "Demander un retrait",
    "withdraw.submitted": "Demande de retrait envoyée",
    "auth.signIn": "Se connecter",
    "auth.signUp": "Créer un compte",
    "auth.welcomeBack": "Bon retour",
    "auth.createAcc": "Créer votre compte",
    "auth.forgot": "Mot de passe oublié ?",
    "lang.label": "Langue",
  },
} as const;

type Key = keyof typeof DICT["en"];

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem("safegrow-lang") as Lang | null)) || null;
    const browser = typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
    setLangState(stored ?? (browser as Lang));
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("safegrow-lang", l); } catch (_) { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  const t = (k: Key) => (DICT[lang] as Record<string, string>)[k] ?? (DICT.en as Record<string, string>)[k] ?? k;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
