import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { SERVER } from '../config'

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

function Remote({ stream, id }) {
  const ref = useRef()
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline />
      <span className="label">{id.slice(0, 5)}</span>
    </div>
  )
}

export default function VideoMeet() {
  const { code } = useParams()
  const nav = useNavigate()
  const [joined, setJoined] = useState(false)
  const [username, setUsername] = useState('')
  const [video, setVideo] = useState(true)
  const [audio, setAudio] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [remotes, setRemotes] = useState({})
  const [messages, setMessages] = useState([])
  const [unread, setUnread] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [online, setOnline] = useState(true)
  const [mediaReady, setMediaReady] = useState(() => !navigator.mediaDevices?.getUserMedia)

  const copy = async (what) => {
    const text = what === 'link' ? window.location.href : code
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard may be unavailable */ }
    setCopied(what)
    setTimeout(() => setCopied(''), 1500)
  }
  const copyBar = (
    <div className="copy-bar">
      <span className="code">{code}</span>
      <button type="button" className="btn small" onClick={() => copy('code')}>{copied === 'code' ? 'Copied!' : 'Copy code'}</button>
      <button type="button" className="btn small" onClick={() => copy('link')}>{copied === 'link' ? 'Copied!' : 'Copy link'}</button>
    </div>
  )

  const localRef = useRef()
  const lobbyRef = useRef()
  const streamRef = useRef(null)
  const socketRef = useRef(null)
  const peers = useRef({})
  const chatOpenRef = useRef(false)
  useEffect(() => { chatOpenRef.current = chatOpen }, [chatOpen])

  // Acquire camera/mic for the lobby preview.
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = s
        if (lobbyRef.current) lobbyRef.current.srcObject = s
      })
      .catch(() => setError('Camera/microphone unavailable. You can still join without them.'))
      .finally(() => { if (!cancelled) setMediaReady(true) })
    return () => { cancelled = true }
  }, [])

  const cleanup = useCallback(() => {
    Object.values(peers.current).forEach((p) => p.close())
    peers.current = {}
    socketRef.current?.disconnect()
    socketRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])
  useEffect(() => cleanup, [cleanup])

  const createPeer = useCallback((id) => {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    peers.current[id] = pc
    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('signal', id, JSON.stringify({ ice: e.candidate }))
    }
    pc.ontrack = (e) => setRemotes((r) => ({ ...r, [id]: e.streams[0] }))
    const local = streamRef.current
    ;['video', 'audio'].forEach((kind) => {
      const track = local?.getTracks().find((t) => t.kind === kind)
      // Without a local device we still need to be able to receive the other side.
      if (track) pc.addTrack(track, local)
      else pc.addTransceiver(kind, { direction: 'recvonly' })
    })
    return pc
  }, [])

  const onSignal = useCallback(async (fromId, raw) => {
    const msg = JSON.parse(raw)
    const pc = peers.current[fromId] || createPeer(fromId)
    try {
      if (msg.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        if (msg.sdp.type === 'offer') {
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: pc.localDescription }))
        }
      } else if (msg.ice) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.ice))
      }
    } catch (e) { console.error(e) }
  }, [createPeer])

  const connect = () => {
    const socket = io(SERVER)
    socketRef.current = socket
    socket.on('connect', () => { setOnline(true); socket.emit('join_call', code) })
    socket.on('connect_error', () => setOnline(false))
    socket.on('disconnect', () => setOnline(false))
    socket.on('signal', onSignal)
    socket.on('chat_message', (data, sender, senderId) => {
      setMessages((m) => [...m, { data, sender, mine: senderId === socket.id }])
      if (senderId !== socket.id && !chatOpenRef.current) setUnread((u) => u + 1)
    })
    socket.on('user_left', (id) => {
      peers.current[id]?.close()
      delete peers.current[id]
      setRemotes((r) => { const n = { ...r }; delete n[id]; return n })
    })
    socket.on('user_joined', async (id, clients) => {
      // Only the newcomer initiates offers to existing peers.
      if (id !== socket.id) return
      for (const other of clients) {
        if (other === socket.id) continue
        const pc = createPeer(other)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('signal', other, JSON.stringify({ sdp: pc.localDescription }))
      }
    })
    setJoined(true)
  }

  useEffect(() => {
    if (joined && localRef.current) localRef.current.srcObject = streamRef.current
  }, [joined])

  const toggle = (kind, on, setOn) => {
    streamRef.current?.getTracks().filter((t) => t.kind === kind).forEach((t) => { t.enabled = !on })
    setOn(!on)
  }

  const replaceVideoTrack = (track) => {
    Object.values(peers.current).forEach((pc) => {
      const tx = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video')
      if (tx && tx.direction === 'recvonly') tx.direction = 'sendrecv'
      tx?.sender.replaceTrack(track || null)
    })
  }

  const toggleShare = async () => {
    const camTrack = streamRef.current?.getVideoTracks()[0]
    if (sharing) {
      replaceVideoTrack(camTrack)
      if (localRef.current) localRef.current.srcObject = streamRef.current
      setSharing(false)
      return
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const track = screen.getVideoTracks()[0]
      replaceVideoTrack(track)
      if (localRef.current) localRef.current.srcObject = screen
      setSharing(true)
      track.onended = () => {
        replaceVideoTrack(camTrack)
        if (localRef.current) localRef.current.srcObject = streamRef.current
        setSharing(false)
      }
    } catch { /* user cancelled */ }
  }

  const send = (e) => {
    e.preventDefault()
    if (!draft.trim() || !socketRef.current?.connected) return
    socketRef.current.emit('chat_message', draft.trim(), username || 'Guest')
    setDraft('')
  }

  const leave = () => { cleanup(); nav('/') }

  const displayName = username.trim() || 'Guest'
  const navBar = (
    <header className="nav meet-nav">
      <Link to="/" className="brand">hola<span>.</span></Link>
      <div className="user-chip"><span className="avatar-dot">{displayName[0].toUpperCase()}</span>{displayName}</div>
    </header>
  )

  if (!joined) {
    return (
      <div className="lobby-page">
        {navBar}
        <div className="auth-page">
        <div className="card lobby">
          <h2>Ready to join?</h2>
          {copyBar}
          <video ref={lobbyRef} autoPlay muted playsInline className="lobby-video" />
          {error && <p className="error">{error}</p>}
          <input placeholder="Your name" value={username} onChange={(e) => setUsername(e.target.value)} />
          <button className="btn big" onClick={connect} disabled={!mediaReady}>{mediaReady ? 'Join now' : 'Starting camera…'}</button>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="meet">
      <div className="meet-main">
        {navBar}
        {copyBar}
        {!online && <p className="error banner">Can't reach the server ({SERVER}) — chat and other participants won't work. If it is a free Render server it may be waking up (up to a minute); otherwise check the backend is running.</p>}
        <div className="grid" data-count={Object.keys(remotes).length + 1}>
          <div className="video-tile">
            <video ref={localRef} autoPlay muted playsInline />
            <span className="label">{username || 'You'}{sharing ? ' (sharing)' : ''}</span>
          </div>
          {Object.entries(remotes).map(([id, s]) => <Remote key={id} id={id} stream={s} />)}
        </div>
        {Object.keys(remotes).length === 0 && <p className="waiting">Waiting for others — share the code <strong>{code}</strong></p>}
        <div className="controls">
          <button className={video ? 'ctl' : 'ctl off'} onClick={() => toggle('video', video, setVideo)}>{video ? 'Camera on' : 'Camera off'}</button>
          <button className={audio ? 'ctl' : 'ctl off'} onClick={() => toggle('audio', audio, setAudio)}>{audio ? 'Mic on' : 'Mic off'}</button>
          {navigator.mediaDevices?.getDisplayMedia && <button className={sharing ? 'ctl active' : 'ctl'} onClick={toggleShare}>{sharing ? 'Stop sharing' : 'Share screen'}</button>}
          <button className="ctl" onClick={() => { setChatOpen(!chatOpen); setUnread(0) }}>Chat{unread > 0 ? ` (${unread})` : ''}</button>
          <button className="ctl end" onClick={leave}>Leave</button>
        </div>
      </div>
      {chatOpen && (
        <aside className="chat">
          <div className="chat-head">
            <h3>Chat</h3>
            <button type="button" className="close-btn" aria-label="Close chat" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="chat-log">
            {messages.map((m, i) => (
              <div key={i} className={m.mine ? 'msg mine' : 'msg'}><small>{m.mine ? 'You' : m.sender}</small><p>{m.data}</p></div>
            ))}
          </div>
          <form onSubmit={send}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message" />
            <button className="btn">Send</button>
          </form>
        </aside>
      )}
    </div>
  )
}
