import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { io } from 'socket.io-client';

export default function Call() {
  const { token } = useAuth();
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = io({ auth: { token } });
    socket.emit('join-user');
    socket.on('signal', async (msg: any) => {
      if (!pcRef.current) {
        await setupPeer(msg.from);
      }
      const pc = pcRef.current!;
      if (msg.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        if (localVideo.current) localVideo.current.srcObject = stream;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { to: msg.from, type: 'answer', sdp: answer });
      } else if (msg.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === 'ice') {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      }
    });
    (window as any).__callSocket = socket;
    return () => { socket.disconnect(); };
  }, [token]);

  async function setupPeer(remoteId: string) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const s = (window as any).__callSocket;
        s.emit('signal', { to: remoteId, type: 'ice', candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
    };
    pcRef.current = pc;
    return pc;
  }

  async function startCall() {
    const { data: users } = await api.get('/users/search', { params: { q: target } });
    if (!users.length) return;
    const rid = users[0].id;
    await api.post('/calls', { type: 'VIDEO' });
    const pc = await setupPeer(rid);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    if (localVideo.current) localVideo.current.srcObject = stream;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const s = (window as any).__callSocket;
    s.emit('signal', { to: rid, type: 'offer', sdp: offer });
    setStatus('calling');
  }

  function endCall() {
    pcRef.current?.close();
    pcRef.current = null;
    setStatus('idle');
  }

  return (
    <div className="min-h-screen p-4 space-y-3">
      <h1 className="text-2xl font-bold">Call</h1>
      <div className="flex gap-2">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="username" className="border rounded px-3 py-2" />
        <button onClick={startCall} className="bg-green-600 text-white px-4 rounded">Call</button>
        <button onClick={endCall} className="bg-red-600 text-white px-4 rounded">End</button>
      </div>
      <div className="text-sm">Status: {status}</div>
      <div className="flex gap-2">
        <video ref={localVideo} autoPlay muted playsInline className="w-1/2 bg-black" />
        <video ref={remoteVideo} autoPlay playsInline className="w-1/2 bg-black" />
      </div>
    </div>
  );
}
