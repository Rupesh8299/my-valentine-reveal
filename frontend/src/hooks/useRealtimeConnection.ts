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
  | { type: "gesture"; [key: string]: unknown }
  | { type: "liquid-pointer"; [key: string]: unknown }
  | { type: "presentation"; [key: string]: unknown }
  | { type: "presentation-request"; [key: string]: unknown };

type RealtimeStatus = "offline" | "connecting" | "connected";

export function useRealtimeConnection(
  inviteToken: string | undefined,
  onData?: (data: unknown) => void,
  ownerSpaceId?: string,
) {
  const [status, setStatus] = useState<RealtimeStatus>("offline");
  const [peerConnected, setPeerConnected] = useState(false);
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
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        send({ type: "offer", description: offer });
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
      } else if (event.type === "chat" || event.type === "chat-history" || event.type === "chat-history-sync" || event.type === "gesture" || event.type === "liquid-pointer" || event.type === "presentation" || event.type === "presentation-request") {
        onDataRef.current?.(event);
      }
    };

    return () => {
      disposed = true;
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

  return { status, peerConnected, sendData };
}
