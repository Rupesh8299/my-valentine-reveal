import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Heart, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { login, loginWithSupabase, register, registerWithSupabase, signInWithGoogle, syncSupabaseSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

const Auth = ({ mode }: { mode: "login" | "register" }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    syncSupabaseSession()
      .then((account) => {
        if (account) navigate("/dashboard", { replace: true });
      })
      .catch(() => undefined);
  }, [navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (isRegister && supabase) {
        await registerWithSupabase(firstName, lastName, email, password);
        setVerificationSent(true);
        toast.success("Verification email sent. Confirm it before signing in.");
        return;
      }
      if (!isRegister && supabase) {
        await loginWithSupabase(email, password);
        navigate("/dashboard");
        return;
      }
      if (isRegister) await register(firstName, lastName, email, password);
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090712] px-5 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(244,63,94,.28),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(168,85,247,.24),transparent_38%)]" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="relative mx-auto flex min-h-[70vh] max-w-md items-center">
        <form onSubmit={submit} className="glass-card glow-border w-full rounded-[2rem] p-7 shadow-2xl shadow-rose-950/30">
          <div className="mb-8 flex items-center gap-3">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.4 }}><Heart className="fill-rose-400 text-rose-400" aria-hidden="true" /></motion.div>
            <div>
              <p className="flex items-center gap-2 font-romantic text-2xl text-rose-200">Valentine Reveal <Sparkles size={15} className="text-amber-300" aria-hidden="true" /></p>
              <h1 className="text-2xl font-semibold">{isRegister ? "Create your private space" : "Welcome back"}</h1>
            </div>
          </div>
          {verificationSent ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-5 text-sm text-white/75">
              <p className="font-semibold text-rose-100">Check your inbox</p>
              <p className="mt-2">We sent a verification link to {email}. After confirming it, return here to sign in.</p>
              <button type="button" onClick={() => setVerificationSent(false)} className="mt-4 text-rose-200 underline underline-offset-4">Use another email</button>
            </div>
          ) : (
          <>
          {isRegister && (
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70" htmlFor="first-name">First name</label>
                <input id="first-name" type="text" required autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none ring-rose-400 focus:ring-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70" htmlFor="last-name">Last name <span className="text-white/40">(optional)</span></label>
                <input id="last-name" type="text" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none ring-rose-400 focus:ring-2" />
              </div>
            </div>
          )}
          <label className="mb-2 block text-sm text-white/70" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mb-5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none ring-rose-400 focus:ring-2" />
          <label className="mb-2 block text-sm text-white/70" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={10} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mb-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none ring-rose-400 focus:ring-2" />
          {isRegister && <p className="mb-5 text-xs text-white/50">Use at least 10 characters.</p>}
          {!isRegister && <div className="mb-5" />}
          <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 font-semibold transition hover:bg-rose-400 disabled:opacity-60">
            {busy && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {isRegister ? "Create account" : "Sign in"}
          </button>
          {supabase && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/35"><span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" /></div>
              <button type="button" disabled={busy} onClick={() => signInWithGoogle().catch((error) => toast.error(error instanceof Error ? error.message : "Unable to continue with Google."))} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold transition hover:bg-white/10 disabled:opacity-60">
                Continue with Google <ArrowRight size={16} aria-hidden="true" />
              </button>
            </>
          )}
          <p className="mt-6 text-center text-sm text-white/60">
            {isRegister ? "Already have an account?" : "Need an account?"}{" "}
            <Link className="text-rose-300 hover:text-rose-200" to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Register"}
            </Link>
          </p>
          </>
          )}
        </form>
      </motion.div>
    </main>
  );
};

export default Auth;
