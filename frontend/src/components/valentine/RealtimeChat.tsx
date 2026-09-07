import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Bell, Download, ImagePlus, Maximize2, MessageCircle, Minimize2, Paperclip, Send, X } from "lucide-react";

export type RealtimeMessage = {
  type: "chat";
  id: string;
  text: string;
  sentAt: string;
  sender: "me" | "them";
  media?: { kind: "image" | "video"; url: string; name: string };
};

type RealtimeChatProps = {
  connected: boolean;
  partnerName: string;
  messages: RealtimeMessage[];
  unread: number;
  onSend: (message: Omit<RealtimeMessage, "sender">) => boolean;
  onOpen: () => void;
  onClose: () => void;
  open: boolean;
  onMedia: (file: File) => Promise<boolean>;
  onPreviewChange?: (open: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
};

const RealtimeChat = ({ connected, partnerName, messages, unread, onSend, onMedia, onOpen, onClose, open, onPreviewChange, onExpandedChange }: RealtimeChatProps) => {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<RealtimeMessage["media"] | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldFollowMessagesRef = useRef(true);

  useEffect(() => {
    if (!shouldFollowMessagesRef.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);
  useEffect(() => {
    onPreviewChange?.(Boolean(preview));
  }, [onPreviewChange, preview]);
  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (onSend({ type: "chat", id, text: trimmed, sentAt: new Date().toISOString() })) setText("");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open private chat"
        onClick={onOpen}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all hover:bg-white/[0.14] active:scale-95"
      >
        {unread > 0 ? <Bell size={18} aria-hidden="true" /> : <MessageCircle size={18} aria-hidden="true" />}
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && typeof document !== "undefined" && createPortal((
        <motion.section
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className={`${expanded ? "fixed inset-3 sm:inset-8" : "fixed inset-x-0 bottom-0 top-[4.75rem] w-full rounded-b-none rounded-t-3xl md:absolute md:bottom-auto md:right-4 md:top-20 md:inset-x-auto md:max-h-none md:w-[min(24rem,calc(100vw-2rem))] md:rounded-2xl"} !z-[9999] flex min-h-0 flex-col border border-white/15 bg-[#120d1d] p-4 shadow-2xl`}
          aria-label="Private chat"
        >
          <header className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Private chat</h2>
              <p className="text-xs text-white/50">{connected ? `Connected with ${partnerName}` : `Waiting for ${partnerName} · messages are queued`}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label={expanded ? "Exit full screen chat" : "Expand chat full screen"} onClick={() => setExpanded((value) => !value)} className="hidden rounded-full p-2 text-white/60 hover:bg-white/10 md:inline-flex">{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
              <button type="button" aria-label="Close private chat" onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10"><X size={17} /></button>
            </div>
          </header>
          <div
            ref={messagesRef}
            onScroll={() => {
              const element = messagesRef.current;
              if (!element) return;
              shouldFollowMessagesRef.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 48;
            }}
            className={`${expanded ? "flex-1" : "flex-1 md:max-h-64 md:flex-none"} my-4 flex min-h-0 flex-col gap-2 overflow-y-auto pr-1 text-sm`}
          >
            {!messages.length && <p className="m-auto text-center text-white/40">Your private messages will appear here.</p>}
            {messages.map((message) => (
              <div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 ${message.sender === "me" ? "self-end rounded-br-sm bg-rose-500/80" : "self-start rounded-bl-sm bg-white/10"}`}>
                {message.media && (
                  <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    {message.media.kind === "image" ? (
                      <img
                        src={message.media.url}
                        alt={message.media.name}
                        onClick={() => setPreview(message.media || null)}
                        className="max-h-64 w-full cursor-zoom-in object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.parentElement?.classList.add("p-3");
                        }}
                      />
                    ) : (
                      <video src={message.media.url} controls className="max-h-64 w-full cursor-zoom-in" onClick={() => setPreview(message.media || null)} />
                    )}
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-white/60">
                      <span className="truncate">{message.media.name}</span>
                      <span className="flex shrink-0 gap-1">
                        <button type="button" aria-label={`Expand ${message.media.name}`} onClick={() => setPreview(message.media || null)} className="rounded p-1 hover:bg-white/10"><Maximize2 size={14} /></button>
                        <a aria-label={`Download ${message.media.name}`} download={message.media.name} href={message.media.url} className="rounded p-1 hover:bg-white/10"><Download size={14} /></a>
                      </span>
                    </div>
                  </div>
                )}
                {message.text && <p className="text-white/90">{message.text}</p>}
                <time className="mt-1 block text-[10px] text-white/50">{new Date(message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="mt-auto flex gap-2 md:mt-0">
            <label className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-black/20 text-white/70 hover:bg-white/10" aria-label="Attach image or video">
              <Paperclip size={16} /><input type="file" accept="image/*,video/*" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (file) await onMedia(file); event.target.value = ""; }} />
            </label>
            <input aria-label="Chat message" value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400" />
            <button type="submit" aria-label="Send chat message" disabled={!text.trim()} className="flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-rose-500 disabled:opacity-40"><Send size={16} /></button>
          </form>
          <p className="mt-2 text-[11px] text-white/35"><ImagePlus size={12} className="mr-1 inline" />Images/videos are queued locally until the other page connects.</p>
        </motion.section>
      ), document.body)}
      {preview && typeof document !== "undefined" && createPortal((
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Media preview" onClick={() => setPreview(null)}>
          <div className="relative max-h-full max-w-full" onClick={(event) => event.stopPropagation()}>
            {preview.kind === "image" ? <img src={preview.url} alt={preview.name} className="max-h-[85vh] max-w-[92vw] object-contain" /> : <video src={preview.url} controls autoPlay className="max-h-[85vh] max-w-[92vw]" />}
            <div className="absolute right-2 top-2 flex gap-2">
              <a download={preview.name} href={preview.url} aria-label={`Download ${preview.name}`} className="rounded-full bg-black/60 p-3 text-white hover:bg-black/80"><Download size={18} /></a>
              <button type="button" aria-label="Close media preview" onClick={() => setPreview(null)} className="rounded-full bg-black/60 p-3 text-white hover:bg-black/80"><X size={18} /></button>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
};

export default RealtimeChat;
