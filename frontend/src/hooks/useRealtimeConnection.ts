import { useCallback, useEffect, useRef, useState } from "react";
import { realtimeUrl } from "@/lib/api";

type SignalingEvent =
  | { type: "connected"; peers: number }
  | { type: "peer-joined" }
  | { type: "peer-left" }
  | { type: "offer"; description: RTCSessionDescriptionInit }
  | { type: "answer"; description: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit }
  | { type: "chat"; [key: string]: unknown }
  | { type: "chat-history"; messages: unknown[] }
  | { type: "chat-history-sync"; messages: unknown[] }
  | { type: "chat-edit"; id: string; text: string }
  | { type: "chat-delete"; id: string }
  | { type: "gesture"; [key: string]: unknown }
  | { type: "liquid-pointer"; [key: string]: unknown }
  | { type: "presentation"; [key: string]: unknown }
  | { type: "call-request" }
  | { type: "call-accept" }
  | { type: "call-decline" }
  | { type: "call-end" }
  | { type: "presentation-request"; [key: string]: unknown };

type RealtimeStatus = "offline" | "connecting" | "connected";

export function useRealtimeConnection(
  inviteToken: string | undefined,
  onData?: (data: unknown) => void,
  ownerSpaceId?: string,
) {
  const [status, setStatus] = useState<RealtimeStatus>("offline");
  const [peerConnected, setPeerConnected] = useState(false);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const signalingPeerRef = useRef(false);
  const rtcConnectedRef = useRef(false);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if ((!inviteToken && !ownerSpaceId) || typeof window === "undefined" || !("WebSocket" in window)) return;

    let disposed = false;
    const socket = new WebSocket(
      ownerSpaceId
        ? `${realtimeUrl}?spaceId=${encodeURIComponent(ownerSpaceId)}`
        : `${realtimeUrl}?invite=${encodeURIComponent(inviteToken || "")}`,
    );
    socketRef.current = socket;
    setStatus("connecting");

    // Cleanly close the socket on page reload to prevent Vite proxy ECONNRESET crashes
    const handleBeforeUnload = () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const send = (event: object) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
    };

    const updateConnectionState = () => {
      setPeerConnected(signalingPeerRef.current || rtcConnectedRef.current);
    };

    const closePeer = () => {
      channelRef.current?.close();
      peerRef.current?.close();
      channelRef.current = null;
      peerRef.current = null;
      pendingCandidates.current = [];
      rtcConnectedRef.current = false;
      updateConnectionState();
    };

    const createPeer = async (initiator: boolean) => {
      if (peerRef.current) return;
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = peer;
      peer.onicecandidate = (event) => {
        if (event.candidate) send({ type: "ice-candidate", candidate: event.candidate.toJSON() });
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
          rtcConnectedRef.current = false;
          updateConnectionState();
        }
        if (peer.connectionState === "connected") {
          rtcConnectedRef.current = true;
          updateConnectionState();
        }
      };
      peer.ondatachannel = (event) => {
        channelRef.current = event.channel;
        event.channel.onopen = () => {
          rtcConnectedRef.current = true;
          updateConnectionState();
        };
        event.channel.onclose = () => {
          rtcConnectedRef.current = false;
          updateConnectionState();
        };
        event.channel.onerror = () => {
          rtcConnectedRef.current = false;
          updateConnectionState();
        };
        event.channel.onmessage = (message) => {
          try {
            onDataRef.current?.(JSON.parse(message.data));
          } catch {
            onDataRef.current?.(message.data);
          }
        };
      };
      peer.ontrack = (event) => {
        setRemoteAudioStream(event.streams[0]);
      };
      peer.onnegotiationneeded = async () => {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          send({ type: "offer", description: offer });
        } catch (err) {
          console.error("Renegotiation failed", err);
        }
      };

      if (localAudioStreamRef.current) {
        localAudioStreamRef.current.getTracks().forEach(track => {
          peer.addTrack(track, localAudioStreamRef.current!);
        });
      }

      if (initiator) {
        const channel = peer.createDataChannel("valentine-events");
        channelRef.current = channel;
        channel.onopen = () => {
          rtcConnectedRef.current = true;
          updateConnectionState();
        };
        channel.onclose = () => {
          rtcConnectedRef.current = false;
          updateConnectionState();
        };
        channel.onerror = () => {
          rtcConnectedRef.current = false;
          updateConnectionState();
        };
        // The initial offer will be triggered by onnegotiationneeded when the data channel is added.
      }
    };

    socket.onopen = () => setStatus("connected");
    socket.onclose = () => {
      closePeer();
      signalingPeerRef.current = false;
      updateConnectionState();
      if (!disposed) setStatus("offline");
    };
    socket.onerror = () => {
      if (!disposed) setStatus("offline");
    };
    socket.onmessage = async (message) => {
      let event: SignalingEvent;
      try {
        event = JSON.parse(message.data) as SignalingEvent;
      } catch {
        return;
      }
      if (event.type === "connected") {
        signalingPeerRef.current = event.peers >= 2;
        updateConnectionState();
        return;
      }
      if (event.type === "peer-joined") {
        signalingPeerRef.current = true;
        updateConnectionState();
        // The owner creates the offer when the receiver joins. If the receiver
        // arrived first, the receiver becomes the initiator instead.
        await createPeer(Boolean(ownerSpaceId));
      } else if (event.type === "offer") {
        await createPeer(false);
        const peer = peerRef.current;
        if (!peer) return;
        await peer.setRemoteDescription(event.description);
        for (const candidate of pendingCandidates.current) await peer.addIceCandidate(candidate);
        pendingCandidates.current = [];
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        send({ type: "answer", description: answer });
      } else if (event.type === "answer" && peerRef.current) {
        await peerRef.current.setRemoteDescription(event.description);
      } else if (event.type === "ice-candidate") {
        const peer = peerRef.current;
        if (!peer?.remoteDescription) pendingCandidates.current.push(event.candidate);
        else await peer.addIceCandidate(event.candidate);
      } else if (event.type === "peer-left") {
        signalingPeerRef.current = false;
        closePeer();
      } else if (event.type === "call-request" || event.type === "call-accept" || event.type === "call-decline" || event.type === "call-end" || event.type === "chat" || event.type === "chat-edit" || event.type === "chat-delete" || event.type === "chat-history" || event.type === "chat-history-sync" || event.type === "gesture" || event.type === "liquid-pointer" || event.type === "presentation" || event.type === "presentation-request") {
        onDataRef.current?.(event);
      }
    };

    return () => {
      disposed = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.close();
      closePeer();
      socketRef.current = null;
    };
  }, [inviteToken, ownerSpaceId]);

  const sendData = useCallback((data: unknown) => {
    if (channelRef.current?.readyState === "open") {
      channelRef.current.send(JSON.stringify(data));
      return true;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalAudioStream(stream);
      localAudioStreamRef.current = stream;
      if (peerRef.current) {
        stream.getTracks().forEach(track => peerRef.current!.addTrack(track, stream));
      }
      return true;
    } catch (err) {
      console.error("Failed to start audio", err);
      return false;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (localAudioStreamRef.current && peerRef.current) {
      const senders = peerRef.current.getSenders();
      localAudioStreamRef.current.getTracks().forEach(track => {
        const sender = senders.find(s => s.track === track);
        if (sender) peerRef.current!.removeTrack(sender);
        track.stop();
      });
    } else if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalAudioStream(null);
    localAudioStreamRef.current = null;
    setRemoteAudioStream(null);
  }, []);

  return { status, peerConnected, sendData, startAudio, stopAudio, localAudioStream, remoteAudioStream };
}
