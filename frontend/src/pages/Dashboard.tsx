import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, ExternalLink, Heart, Link2, LogOut, Pencil, RefreshCw, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Account, createSpace, currentAccount, deleteSpace, listSpaces, logout, regenerateInvite, revokeInvite, Space, updateProfile } from "@/lib/auth";

const Dashboard = () => {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loverName, setLoverName] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deletingSpaceId, setDeletingSpaceId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    currentAccount()
      .then((loadedAccount) => {
        setAccount(loadedAccount);
        return listSpaces().then(({ spaces: ownedSpaces }) => {
          setSpaces(ownedSpaces);
          try {
            const saved = JSON.parse(localStorage.getItem(`valentine-invites-${loadedAccount.id}`) || "{}");
            if (saved && typeof saved === "object") setInviteUrls(saved as Record<string, string>);
          } catch {
            localStorage.removeItem(`valentine-invites-${loadedAccount.id}`);
          }
        });
      })
      .catch(() => navigate("/login"));
  }, [navigate]);

  function saveInviteUrls(next: Record<string, string>) {
    setInviteUrls(next);
    if (!account) return;
    try {
      localStorage.setItem(`valentine-invites-${account.id}`, JSON.stringify(next));
    } catch {
      toast.error("Invite link could not be saved on this device.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const space = await createSpace(loverName);
      const url = `${window.location.origin}/invite/${space.inviteToken}`;
      setInviteUrl(url);
      saveInviteUrls({ ...inviteUrls, [space.spaceId]: url });
      setSpaces((current) => [{
        id: space.spaceId,
        lover_name: space.loverName,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }, ...current]);
      toast.success("Private page created.");
      setLoverName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create page.");
    } finally {
      setBusy(false);
    }
  }

  function openProfile() {
    if (!account) return;
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setProfileOpen(true);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileBusy(true);
    try {
      const updated = await updateProfile(firstName, lastName);
      setAccount(updated);
      setProfileOpen(false);
      toast.success("Your name was updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update your name.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function refreshInvite(space: Space) {
    try {
      const invite = await regenerateInvite(space.id);
      const url = `${window.location.origin}${invite.inviteUrl}`;
      setInviteUrl(url);
      saveInviteUrls({ ...inviteUrls, [space.id]: url });
      setSpaces((current) => current.map((item) => item.id === space.id
        ? { ...item, expires_at: invite.expiresAt }
        : item));
      toast.success("A new invitation link is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to regenerate invite.");
    }
  }

  async function disableInvite(space: Space) {
    try {
      await revokeInvite(space.id);
      setSpaces((current) => current.map((item) => item.id === space.id
        ? { ...item, expires_at: null }
        : item));
      setInviteUrl("");
      toast.success("Invitation revoked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to revoke invite.");
    }
  }

  async function removeSpace(space: Space) {
    if (!window.confirm(`Remove the private page for ${space.lover_name}? This also invalidates its invitation link.`)) return;
    setDeletingSpaceId(space.id);
    try {
      await deleteSpace(space.id);
      setSpaces((current) => current.filter((item) => item.id !== space.id));
      const next = { ...inviteUrls };
      delete next[space.id];
      saveInviteUrls(next);
      toast.success("Private page removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove private page.");
    } finally {
      setDeletingSpaceId(null);
    }
  }

  async function copyInviteUrl(url: string) {
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        if (!document.execCommand("copy")) throw new Error("Clipboard access is unavailable.");
        input.remove();
      }
      toast.success("Invite link copied.");
    } catch {
      toast.error("Copy is unavailable here. Press and hold the link to copy it.");
    }
  }

  async function copyInvite() {
    await copyInviteUrl(inviteUrl);
  }

  if (!account) return null;
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090712] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(244,63,94,.2),transparent_30%),radial-gradient(circle_at_90%_90%,rgba(139,92,246,.18),transparent_34%)]" />
      <div className="mx-auto max-w-4xl">
        <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="relative mb-12 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <Heart className="fill-rose-400 text-rose-400" aria-hidden="true" />
            <span className="font-romantic text-2xl text-rose-200">Valentine Reveal</span>
          </Link>
          <button onClick={() => logout().finally(() => navigate("/login"))} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-white/75 hover:bg-white/10">
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </motion.header>
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-8">
          <p className="text-sm text-rose-300">Private dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold">Create a page for someone special.</h1>
          <p className="mt-3 max-w-xl text-white/60">
            Signed in as {account.firstName}{account.lastName ? ` ${account.lastName}` : ""} ({account.email}).
            Each page gets its own secure, expiring invitation link.
          </p>
          <button type="button" onClick={openProfile} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-white/75 hover:bg-white/10">
            <Pencil size={15} aria-hidden="true" /> Edit name
          </button>
        </motion.section>
        {profileOpen && (
          <form onSubmit={saveProfile} className="glass-card mb-6 max-w-xl rounded-3xl p-6">
            <h2 className="text-lg font-semibold">Update your name</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-first-name" className="mb-2 block text-sm text-white/70">First name</label>
                <input id="profile-first-name" required maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none ring-rose-400 focus:ring-2" />
              </div>
              <div>
                <label htmlFor="profile-last-name" className="mb-2 block text-sm text-white/70">Last name <span className="text-white/40">(optional)</span></label>
                <input id="profile-last-name" maxLength={80} value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none ring-rose-400 focus:ring-2" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button disabled={profileBusy} className="min-h-11 rounded-xl bg-rose-500 px-4 font-semibold hover:bg-rose-400 disabled:opacity-60">{profileBusy ? "Saving..." : "Save name"}</button>
              <button type="button" onClick={() => setProfileOpen(false)} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm hover:bg-white/10">Cancel</button>
            </div>
          </form>
        )}
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} onSubmit={submit} className="glass-card relative max-w-xl rounded-3xl p-6">
          <label htmlFor="lover-name" className="mb-2 block text-sm text-white/70">Their name</label>
          <input id="lover-name" required value={loverName} onChange={(event) => setLoverName(event.target.value)} className="mb-4 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none ring-rose-400 focus:ring-2" placeholder="e.g. Priya" />
          <button disabled={busy} className="min-h-12 rounded-xl bg-rose-500 px-5 font-semibold hover:bg-rose-400 disabled:opacity-60">{busy ? "Creating..." : "Create private page"}</button>
        </motion.form>
        {inviteUrl && (
          <section className="glass-card mt-6 max-w-xl rounded-3xl p-6">
            <p className="font-semibold">Your invitation link</p>
            <p className="mt-2 break-all text-sm text-white/60">{inviteUrl}</p>
            <button type="button" onClick={copyInvite} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm hover:bg-white/10"><Copy size={16} aria-hidden="true" /> Copy link</button>
          </section>
        )}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Link2 className="text-rose-300" size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Your private pages</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {spaces.map((space) => (
              <motion.article key={space.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="glass-card relative rounded-3xl p-5">
                <p className="pr-12 font-romantic text-2xl text-rose-200">{space.lover_name}</p>
                <p className="mt-1 text-xs text-white/50">Created {new Date(space.created_at).toLocaleDateString()}</p>
                <p className="mt-4 text-sm text-white/65">
                  {space.expires_at ? `Invite active until ${new Date(space.expires_at).toLocaleDateString()}.` : "No active invite."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={space.expires_at ? `/live/${space.id}` : undefined}
                    target={space.expires_at ? "_blank" : undefined}
                    rel={space.expires_at ? "noreferrer" : undefined}
                    aria-disabled={!space.expires_at}
                    onClick={(event) => {
                      if (!space.expires_at) event.preventDefault();
                    }}
                    className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${
                      space.expires_at
                        ? "bg-rose-500 hover:bg-rose-400"
                        : "cursor-not-allowed border border-white/10 bg-white/5 text-white/35"
                    }`}
                  >
                    <ExternalLink size={15} aria-hidden="true" /> Open live page
                  </a>
                  <button type="button" onClick={() => refreshInvite(space)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm hover:bg-white/10">
                    <RefreshCw size={15} aria-hidden="true" /> New link
                  </button>
                  {space.expires_at && (
                    <button type="button" onClick={() => disableInvite(space)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-rose-200 hover:bg-white/10">
                      <ShieldOff size={15} aria-hidden="true" /> Revoke
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!inviteUrls[space.id]}
                  aria-label={`Copy invitation link for ${space.lover_name}`}
                  title={inviteUrls[space.id] ? "Copy invitation link" : "No invitation link saved"}
                  onClick={() => inviteUrls[space.id] && copyInviteUrl(inviteUrls[space.id])}
                  className="absolute right-16 top-4 grid size-10 place-items-center rounded-xl border border-white/15 text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Copy size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove private page for ${space.lover_name}`}
                  title="Remove private page"
                  disabled={deletingSpaceId === space.id}
                  onClick={() => removeSpace(space)}
                  className="absolute right-4 top-4 grid size-10 place-items-center rounded-xl border border-rose-400/30 text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </motion.article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
