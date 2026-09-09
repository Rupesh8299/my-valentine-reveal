import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Bell, Download, ImagePlus, Maximize2, MessageCircle, Minimize2, Paperclip, Pencil, Send, Trash2, X, Mic, MicOff, Square, Phone, PhoneOff, PhoneCall, Volume1, Volume2 } from "lucide-react";

export type RealtimeMessage = {
  type: "chat";
  id: string;
  text: string;
  sentAt: string;
  sender: "me" | "them";
  media?: { kind: "image" | "video" | "audio"; url: string; name: string };
  isEdited?: boolean;
  isDeleted?: boolean;
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
  onEdit?: (id: string, newText: string) => void;
  onDelete?: (id: string) => void;
  peerLastActive?: number | null;
  callStatus?: "idle" | "incoming" | "ringing" | "connected";
  onInitiateCall?: () => void;
  onAcceptCall?: () => void;
  onDeclineCall?: () => void;
  onEndCall?: () => void;
  remoteAudioStream?: MediaStream | null;
  localAudioStream?: MediaStream | null;
  onPreviewChange?: (open: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
};

const RealtimeChat = ({ connected, partnerName, messages, unread, onSend, onMedia, onEdit, onDelete, peerLastActive, callStatus = "idle", onInitiateCall, onAcceptCall, onDeclineCall, onEndCall, remoteAudioStream, localAudioStream, onOpen, onClose, open, onPreviewChange, onExpandedChange }: RealtimeChatProps) => {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<RealtimeMessage["media"] | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (callStatus === "idle") {
      setIsMicMuted(false);
      setIsSpeaker(false);
    }
  }, [callStatus]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordingBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Failed to start recording:", e);
      alert("Microphone permission denied or unavailable.");
    }
  };

  const discardRecording = () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingBlob(null);
    setRecordingUrl(null);
  };

  const sendRecording = async () => {
    if (!recordingBlob) return;
    const file = new File([recordingBlob], `voice-message-${Date.now()}.webm`, { type: "audio/webm" });
    await onMedia(file);
    discardRecording();
  };

  const formatLastSeen = (timestamp: number | null | undefined) => {
    if (!timestamp) return "Waiting for connection";
    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "Last seen just now";
    if (diffMinutes < 60) return `Last seen ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    const date = new Date(timestamp);
    return `Last seen at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };
  const messagesRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldFollowMessagesRef = useRef(true);

  const prevMessagesLength = useRef(messages.length);

  // Smart scroll: instantly scroll if loading history, smoothly scroll for new single messages
  useEffect(() => {
    if (!shouldFollowMessagesRef.current || !messagesRef.current) {
      prevMessagesLength.current = messages.length;
      return;
    }

    const diff = Math.abs(messages.length - prevMessagesLength.current);
    const behavior = diff > 2 ? "auto" : "smooth";

    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior,
    });

    prevMessagesLength.current = messages.length;
  }, [messages]);

  // Jump to bottom instantly when opening chat
  useEffect(() => {
    if (open && messagesRef.current) {
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 10);
    }
  }, [open]);
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
    
    if (editingMessageId) {
      onEdit?.(editingMessageId, trimmed);
      setEditingMessageId(null);
      setText("");
      return;
    }

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
          layout
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className={`!z-[9999] flex min-h-0 flex-col border border-white/15 bg-[#120d1d] p-4 shadow-2xl ${
            expanded
              ? "fixed inset-0 sm:inset-4 md:inset-auto md:absolute md:bottom-4 md:right-4 md:top-20 md:w-[min(24rem,calc(100vw-2rem))] rounded-none sm:rounded-2xl"
              : "fixed inset-x-0 bottom-0 top-[4.75rem] w-full rounded-b-none rounded-t-3xl md:absolute md:bottom-auto md:inset-x-auto md:right-4 md:top-20 md:w-[min(24rem,calc(100vw-2rem))] md:rounded-2xl"
          }`}
          aria-label="Private chat"
        >
          <motion.header layout className="flex shrink-0 items-center justify-between">
            <div>
              <h2 className="font-semibold">Private chat</h2>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-white/30'}`}></span>
                </span>
                <p className="text-xs text-white/60">
                  {connected ? "Online" : formatLastSeen(peerLastActive)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {connected && callStatus === "idle" && (
                <button type="button" aria-label="Start voice call" onClick={onInitiateCall} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><Phone size={17} /></button>
              )}
              <button type="button" aria-label={expanded ? "Exit full screen chat" : "Expand chat full screen"} onClick={() => setExpanded((value) => !value)} className="hidden rounded-full p-2 text-white/60 hover:bg-white/10 md:inline-flex">{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
              <button type="button" aria-label="Close private chat" onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10"><X size={17} /></button>
            </div>
          </motion.header>
          <motion.div
            ref={messagesRef}
            onScroll={() => {
              const element = messagesRef.current;
              if (!element) return;
              shouldFollowMessagesRef.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 48;
            }}
            className={`${expanded ? "flex-1" : "flex-1 md:max-h-64 md:flex-none"} my-4 flex min-h-0 flex-col gap-2 overflow-y-auto pr-2 text-sm custom-scrollbar`}
          >
            {!messages.length && <p className="m-auto text-center text-white/40">Your private messages will appear here.</p>}
            {messages.map((message) => {
              const isMe = message.sender === "me";
              const sentTime = new Date(message.sentAt).getTime();
              const canEditDelete = isMe && (Date.now() - sentTime) < 5 * 60 * 1000;

              return (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                key={message.id}
                onClick={() => isMe && !message.isDeleted ? setActiveMessageId(activeMessageId === message.id ? null : message.id) : undefined}
                onMouseLeave={() => isMe ? setActiveMessageId(null) : undefined}
                className={`group relative max-w-[85%] rounded-2xl px-3 py-2 ${isMe ? "self-end rounded-br-sm bg-rose-500/80 cursor-pointer" : "self-start rounded-bl-sm bg-white/10"} ${message.isDeleted ? "bg-transparent border border-white/10 text-white/40 italic pointer-events-none" : ""}`}
              >
                {!message.isDeleted && canEditDelete && (
                  <div className={`absolute top-0 right-full pr-2 flex items-center gap-1 transition-all ${activeMessageId === message.id ? 'opacity-100 pointer-events-auto translate-x-0' : 'opacity-0 pointer-events-none translate-x-2 md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0'}`}>
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#120d1d] p-1 shadow-lg">
                      <button type="button" aria-label="Edit message" onClick={(e) => { e.stopPropagation(); setActiveMessageId(null); setEditingMessageId(message.id); setText(message.text); }} className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><Pencil size={14} /></button>
                      <button type="button" aria-label="Delete message" onClick={(e) => { e.stopPropagation(); setActiveMessageId(null); onDelete?.(message.id); }} className="rounded-md p-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
                
                {message.isDeleted ? (
                  <p className="text-xs">This message was deleted</p>
                ) : (
                  <>
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
                        ) : message.media.kind === "video" ? (
                          <video src={message.media.url} controls className="max-h-64 w-full cursor-zoom-in" onClick={() => setPreview(message.media || null)} />
                        ) : (
                          <audio src={message.media.url} controls className="h-12 w-full p-1" />
                        )}
                        <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-white/60">
                          <span className="truncate">{message.media.name}</span>
                          <span className="flex shrink-0 gap-1">
                            {message.media.kind !== "audio" && (
                              <button type="button" aria-label={`Expand ${message.media.name}`} onClick={() => setPreview(message.media || null)} className="rounded p-1 hover:bg-white/10"><Maximize2 size={14} /></button>
                            )}
                            <a aria-label={`Download ${message.media.name}`} download={message.media.name} href={message.media.url} className="rounded p-1 hover:bg-white/10"><Download size={14} /></a>
                          </span>
                        </div>
                      </div>
                    )}
                    {message.text && <p className="text-white/90 whitespace-pre-wrap break-words">{message.text}</p>}
                  </>
                )}
                <div className="mt-1 flex items-center justify-end gap-1">
                  {message.isEdited && !message.isDeleted && <span className="text-[9px] text-white/40">(edited)</span>}
                  <time className="block text-[10px] text-white/50">{new Date(message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
              </motion.div>
            )})}
          </motion.div>
          {editingMessageId && (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
              <span className="flex items-center gap-1.5"><Pencil size={12} /> Editing message</span>
              <button type="button" onClick={() => { setEditingMessageId(null); setText(""); }} className="hover:text-white"><X size={14} /></button>
            </motion.div>
          )}
          {recordingUrl ? (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-auto flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-black/20 p-2 md:mt-0">
              <button type="button" onClick={discardRecording} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-rose-400 hover:bg-white/10"><Trash2 size={16} /></button>
              <audio src={recordingUrl} controls className="h-10 flex-1" />
              <button type="button" onClick={sendRecording} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-rose-500 hover:bg-rose-600"><Send size={16} /></button>
            </motion.div>
          ) : (
            <motion.form layout onSubmit={submit} className="mt-auto flex shrink-0 gap-2 md:mt-0">
              <label className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-black/20 text-white/70 hover:bg-white/10" aria-label="Attach image or video">
                <Paperclip size={16} /><input type="file" accept="image/*,video/*" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (file) await onMedia(file); event.target.value = ""; }} />
              </label>
              <input aria-label="Chat message" value={text} onChange={(event) => setText(event.target.value)} placeholder={isRecording ? "Recording..." : "Write a message..."} disabled={isRecording} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50" />
              {text.trim() || editingMessageId ? (
                <button type="submit" aria-label="Send chat message" className="flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-rose-500 hover:bg-rose-600"><Send size={16} /></button>
              ) : (
                <button type="button" aria-label={isRecording ? "Stop recording" : "Record voice message"} onClick={toggleRecording} className={`flex min-h-10 min-w-10 items-center justify-center rounded-xl transition-colors ${isRecording ? "bg-rose-500 animate-pulse text-white" : "border border-white/15 bg-black/20 text-white/70 hover:bg-white/10"}`}>{isRecording ? <Square size={16} /> : <Mic size={16} />}</button>
              )}
            </motion.form>
          )}
          <motion.p layout className="mt-2 shrink-0 text-[11px] text-white/35"><ImagePlus size={12} className="mr-1 inline" />Media is queued locally until the other page connects.</motion.p>
        </motion.section>
      ), document.body)}
      {callStatus !== "idle" && typeof document !== "undefined" && createPortal((
        <motion.div initial={{ opacity: 0, y: -50, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} className="fixed top-6 left-1/2 z-[10000] w-[340px] flex items-center justify-between overflow-hidden rounded-full bg-[#120d1d]/95 px-5 py-3 shadow-2xl backdrop-blur-xl border border-white/10">
          {callStatus === "incoming" && (
            <>
              <div className="flex items-center gap-3">
                <PhoneCall size={20} className="text-rose-400 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate max-w-[100px]">{partnerName}</span>
                  <span className="text-xs text-white/60">Incoming...</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onDeclineCall} className="bg-red-500/20 text-red-500 p-2.5 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                  <PhoneOff size={16} />
                </button>
                <button type="button" onClick={onAcceptCall} className="bg-emerald-500/20 text-emerald-500 p-2.5 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                  <Phone size={16} />
                </button>
              </div>
            </>
          )}
          {callStatus === "ringing" && (
            <>
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-white/40 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate max-w-[100px]">{partnerName}</span>
                  <span className="text-xs text-white/60">Calling...</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onEndCall} className="bg-red-500/20 text-red-500 p-2.5 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                  <PhoneOff size={16} />
                </button>
              </div>
            </>
          )}
          {callStatus === "connected" && (
            <>
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate max-w-[100px]">{partnerName}</span>
                  <span className="text-xs text-emerald-400">Connected</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    const nextMute = !isMicMuted;
                    setIsMicMuted(nextMute);
                    if (localAudioStream) {
                      localAudioStream.getAudioTracks().forEach(track => { track.enabled = !nextMute; });
                    }
                  }} 
                  className={`p-2.5 rounded-full transition-colors ${isMicMuted ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                >
                  {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button type="button" onClick={() => setIsSpeaker(!isSpeaker)} className={`p-2.5 rounded-full transition-colors ${isSpeaker ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                  {isSpeaker ? <Volume2 size={16} /> : <Volume1 size={16} />}
                </button>
                <button type="button" onClick={onEndCall} className="bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 transition-colors">
                  <PhoneOff size={16} />
                </button>
              </div>
            </>
          )}
        </motion.div>
      ), document.body)}
      {remoteAudioStream && (
        <audio
          autoPlay
          ref={(audio) => {
            if (audio && audio.srcObject !== remoteAudioStream) {
              audio.srcObject = remoteAudioStream;
            }
          }}
        />
      )}
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
