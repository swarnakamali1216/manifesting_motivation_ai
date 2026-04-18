/**
 * ChatCoach.jsx — Fixed voice cut-off with chunked TTS
 * Place at: frontend/src/components/ChatCoach.jsx (or pages/ChatCoach.jsx)
 */
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Send, Loader, Volume2, Square } from 'lucide-react';
import VoiceInput from '../components/VoiceInput';
import { useToast } from '../components/ToastSystem';

var API = 'https://manifesting-motivation-backend.onrender.com/api';

var EMOTION_COLORS = {
  positive:'#4ade80', excited:'#fb923c', focused:'#a78bfa',
  hopeful:'#60a5fa', neutral:'#94a3b8', stressed:'#fbbf24',
  anxious:'#fbbf24', sad:'#f87171', negative:'#f87171',
  frustrated:'#fb923c', concerned:'#fbbf24', crisis:'#ef4444',
};
var EMOTION_EMOJI = {
  positive:'😊', excited:'🔥', focused:'🎯', hopeful:'🌟',
  neutral:'😐', stressed:'😤', anxious:'😰', sad:'😢',
  negative:'😞', frustrated:'😤', concerned:'😟', crisis:'💙',
};

var QUICK_SUGGESTIONS = [
  '💡 Give me 3 AI project ideas for final year',
  '🗺️ Full roadmap to become a full stack AI developer',
  '⚡ What should I learn first — React or Python?',
  '😤 I feel stressed about my project deadline',
];

// ── Butterfly logo (replaces robot/brain emojis) ────────────────────────────
function ButterflyMini({ size }) {
  var s = size || 28;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#ccbl1)" opacity="0.93"/>
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#ccbl2)" opacity="0.93"/>
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#ccbl3)" opacity="0.85"/>
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#ccbl4)" opacity="0.85"/>
      <ellipse cx="20" cy="20" rx="1.2" ry="5.5" fill="white" opacity="0.9"/>
      <line x1="20" y1="15" x2="16" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.85"/>
      <line x1="20" y1="15" x2="24" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.85"/>
      <circle cx="16" cy="9" r="1.1" fill="white" opacity="0.9"/>
      <circle cx="24" cy="9" r="1.1" fill="white" opacity="0.9"/>
      <defs>
        <linearGradient id="ccbl1" x1="4"  y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#c4b5fd"/><stop offset="1" stopColor="#e9d5ff"/></linearGradient>
        <linearGradient id="ccbl2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
        <linearGradient id="ccbl3" x1="5"  y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#ddd6fe"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="ccbl4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  );
}

// ── Voice map: ElevenLabs ID → browser TTS gender/preference ────────────────
var VOICE_GENDER = {
  'EXAVITQu4vr4xnSDxMaL': 'female', // Sarah
  '21m00Tcm4TlvDq8ikWAM': 'female', // Rachel
  'AZnzlk1XvdvUeBnXmlld': 'female', // Domi
  'MF3mGyEYCl7XYWbV9V6O': 'female', // Elli
  'TxGEqnHWrfWFTfGW9XjX': 'male',   // Josh
};

function getBrowserVoice(voiceId) {
  var voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;
  var gender = VOICE_GENDER[voiceId] || 'female';
  // Prefer en-IN voices, then en-GB, then en-US
  var enIN   = voices.filter(function(v){ return v.lang.startsWith('en-IN'); });
  var enGB   = voices.filter(function(v){ return v.lang.startsWith('en-GB'); });
  var enUS   = voices.filter(function(v){ return v.lang.startsWith('en-US'); });
  var pool   = enIN.length ? enIN : (enGB.length ? enGB : enUS);
  if (!pool.length) pool = voices.filter(function(v){ return v.lang.startsWith('en'); });
  // Try to match gender via name heuristic
  var genderMatch = pool.filter(function(v){
    var n = v.name.toLowerCase();
    var femaleNames = ['female','woman','sara','rachel','elli','aria','zira','susan','karen','victoria','samantha','moira'];
    var maleNames   = ['male','man','josh','james','daniel','david','alex','mark','lee'];
    var nameList    = (gender === 'female') ? femaleNames : maleNames;
    return nameList.some(function(w){ return n.includes(w); });
  });
  return (genderMatch.length ? genderMatch[0] : pool[0]) || null;
}

// ── Chunked TTS — prevents Chrome/mobile from cutting off long sentences ──────
function speakChunkedTTS(text, onDone) {
  window.speechSynthesis.cancel();
  var sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  var chunks = [];
  var cur = '';
  sentences.forEach(function(s) {
    if ((cur + s).length < 160) { cur += s; }
    else { if (cur.trim()) chunks.push(cur.trim()); cur = s; }
  });
  if (cur.trim()) chunks.push(cur.trim());
  if (!chunks.length) { if (onDone) onDone(); return; }
  // Pick best matching browser voice based on selected persona
  var savedVoiceId = localStorage.getItem('voice_persona') || 'EXAVITQu4vr4xnSDxMaL';
  var preferredVoice = getBrowserVoice(savedVoiceId);
  var idx = 0;
  function next() {
    if (idx >= chunks.length) { if (onDone) onDone(); return; }
    var u = new SpeechSynthesisUtterance(chunks[idx++]);
    u.rate = 0.91; u.lang = 'en-IN';
    if (preferredVoice) u.voice = preferredVoice;
    u.onend = next;
    u.onerror = function(){ if (onDone) onDone(); };
    window.speechSynthesis.speak(u);
  }
  next();
}

// ── Memoised message bubble ───────────────────────────────────────────────────
var MessageBubble = memo(function({ msg, onSpeak, playingId, voiceLoading }) {
  var isUser   = msg.role === 'user';
  var isCrisis = msg.isCrisis;
  var col      = EMOTION_COLORS[msg.emotion] || '#94a3b8';
  var emo      = msg.emotion ? msg.emotion.charAt(0).toUpperCase() + msg.emotion.slice(1) : '';

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap:'4px', animation:'msgIn 0.22s ease',
    }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', flexDirection:isUser?'row-reverse':'row' }}>
        {!isUser && (
          <div style={{
            width:'32px', height:'32px', borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,#7c5cfc,#fc5cf8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'15px', boxShadow:'0 2px 8px rgba(124,92,252,0.3)',
          }}><ButterflyMini size={18}/></div>
        )}
        <div style={{
          maxWidth: window.innerWidth < 480 ? '88%' : '75%',
          padding:'12px 15px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg,#7c5cfc,#9c7cfc)'
            : isCrisis ? '#eff6ff' : 'var(--card,#ffffff)',
          color: isUser ? '#fff' : isCrisis ? '#1e3a8a' : 'var(--text,#1a1a2e)',
          border: isUser ? 'none' : isCrisis ? '2px solid #93c5fd' : '1.5px solid var(--border,#e0d8ff)',
          fontSize:'14px', lineHeight:'1.75',
          fontFamily:"'DM Sans',sans-serif",
          boxShadow: isUser ? '0 3px 12px rgba(124,92,252,0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
          wordBreak:'break-word',
        }}>
          {isCrisis && (
            <div style={{ fontSize:'12px', fontWeight:'800', color:'#1d4ed8', marginBottom:'8px' }}>
              💙 You matter — real support below:
            </div>
          )}
          <p style={{ margin:0, whiteSpace:'pre-wrap' }}>{msg.content}</p>
        </div>
      </div>

      {!isUser && (
        <div style={{ display:'flex', alignItems:'center', gap:'6px', paddingLeft:'40px', flexWrap:'wrap' }}>
          {msg.emotion && (
            <span style={{
              fontSize:'10px', fontWeight:'700', color:col,
              background:col+'18', padding:'2px 7px', borderRadius:'8px',
              fontFamily:"'Syne',sans-serif", border:'1px solid '+col+'30',
            }}>
              {EMOTION_EMOJI[msg.emotion]||''} {emo}
              {msg.vs !== undefined && msg.vs !== null
                ? ' · '+(msg.vs>0?'+':'')+Number(msg.vs).toFixed(2) : ''}
            </span>
          )}
          {msg.xp > 0 && (
            <span style={{
              fontSize:'10px', fontWeight:'800', color:'#4ade80',
              background:'rgba(74,222,128,0.1)', padding:'2px 7px', borderRadius:'8px',
            }}>+{msg.xp} XP</span>
          )}
          {!isCrisis && (
            <button onClick={function(){ onSpeak(msg.id, msg.content); }}
              disabled={voiceLoading && playingId===msg.id}
              style={{
                background: playingId===msg.id ? '#ef4444' : 'rgba(124,92,252,0.1)',
                border:'none', borderRadius:'8px', padding:'3px 8px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:'4px', fontSize:'10px',
                color: playingId===msg.id ? '#fff' : '#7c5cfc', fontWeight:'700', transition:'all 0.15s',
              }}>
              {voiceLoading && playingId===msg.id ? <Loader size={10}/> :
               playingId===msg.id ? <Square size={10} fill="currentColor"/> : <Volume2 size={10}/>}
              {playingId===msg.id ? 'Stop' : '🔊'}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

var TypingDots = memo(function() {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'8px' }}>
      <div style={{
        width:'32px', height:'32px', borderRadius:'50%',
        background:'linear-gradient(135deg,#7c5cfc,#fc5cf8)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px',
      }}><ButterflyMini size={18}/></div>
      <div style={{
        background:'var(--card,#fff)', border:'1.5px solid var(--border,#e0d8ff)',
        borderRadius:'18px 18px 18px 4px', padding:'13px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
          {[0,1,2].map(function(d){
            return <div key={d} style={{
              width:'7px', height:'7px', borderRadius:'50%', background:'#7c5cfc',
              animation:'bounce 1.2s infinite', animationDelay:(d*0.18)+'s',
            }}/>;
          })}
        </div>
      </div>
    </div>
  );
});

export default function ChatCoach({ user }) {
  var [messages,    setMessages]    = useState([]);
  var [input,       setInput]       = useState('');
  var [loading,     setLoading]     = useState(false);
  var [voiceLoading,setVoiceLoading]= useState(false);
  var [playingId,   setPlayingId]   = useState(null);
  var [isMobile,    setIsMobile]    = useState(window.innerWidth < 640);
  var [persona,     setPersona]     = useState(localStorage.getItem('coaching_persona')||'mentor');

  var toast     = useToast();
  var bottomRef = useRef(null);
  var audioRef  = useRef(null);
  var inputRef  = useRef(null);
  var abortRef  = useRef(null);

  useEffect(function(){
    function onResize(){ setIsMobile(window.innerWidth < 640); }
    window.addEventListener('resize', onResize);
    return function(){ window.removeEventListener('resize', onResize); };
  }, []);

  useEffect(function(){
    bottomRef.current?.scrollIntoView({ behavior:'smooth', block:'end' });
  }, [messages, loading]);

  var buildHistory = useCallback(function(msgs){
    return msgs.slice(-8).map(function(m){
      return (m.role==='user'?'user':'bot')+': '+m.content;
    }).join('\n');
  }, []);

  var sendMessage = useCallback(function(text){
    var msg = (text||input||'').trim();
    if (!msg||loading) return;
    setInput('');
    setLoading(true);
    var userMsg = { role:'user', content:msg, id:Date.now() };
    setMessages(function(prev){
      callAPI(msg, prev);
      return prev.concat(userMsg);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading]);

  async function callAPI(msg, prevMessages){
    if (abortRef.current) abortRef.current.abort();
    var controller = new AbortController();
    abortRef.current = controller;
    try {
      var hist = buildHistory(prevMessages);
      var now     = new Date();
      var dayName = now.toLocaleDateString('en-US', { weekday:'long' });
      var dateStr = now.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
      var timeStr = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
      var realDateContext = '[SYSTEM CONTEXT: Today is '+dayName+', '+dateStr+'. Time: '+timeStr+' IST. User is in India.]';

      var res = await fetch(API+'/motivate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        signal: controller.signal,
        body: JSON.stringify({
          message: msg, conversation_history: hist,
          persona: persona, input_type: 'text',
          user_id: user ? user.id : null,
          real_date_context: realDateContext,
        }),
      });
      if (!res.ok) throw new Error('HTTP '+res.status);
      var data = await res.json();
      var botText = data.response || 'Something went wrong.';
      var botMsg = {
        role:'bot', content:botText, id:Date.now()+1,
        emotion: data.emotion||'neutral', vs:data.vader_score,
        xp:data.xp_awarded||0, isCrisis:!!data.is_crisis,
      };
      setMessages(function(prev){ return prev.concat(botMsg); });
      if (data.xp_awarded>0)     toast.xp(data.xp_awarded, 'Chat');
      if (data.current_streak>0) toast.streak(data.current_streak);
      if (localStorage.getItem('voice_auto')==='true' && botText && !data.is_crisis){
        speakText(botMsg.id, botText);
      }
    } catch(err){
      if (err.name==='AbortError') return;
      console.error('ChatCoach error:', err);
      toast.error('Could not get a response. Is Flask running on port 5000?');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // ── speakText: tries ElevenLabs once, caches result, falls back to browser TTS ──
  async function speakText(msgId, text){
    if (playingId===msgId){
      if (audioRef.current){ audioRef.current.pause(); audioRef.current.src=''; }
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }
    setVoiceLoading(true); setPlayingId(msgId);

    // If ElevenLabs was already confirmed broken this session, skip it immediately
    var elKnownBad = localStorage.getItem('el_unavailable') === '1';
    if (!elKnownBad) {
      try {
        var voiceId = localStorage.getItem('voice_persona')||'EXAVITQu4vr4xnSDxMaL';
        var r = await fetch(API+'/speak', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ text:text.slice(0,400), voice_name:voiceId }),
        });
        if (!r.ok) {
          // Mark EL as unavailable for this session so we stop retrying
          if (r.status === 401 || r.status === 403) localStorage.setItem('el_unavailable','1');
          throw new Error('voice '+r.status);
        }
        var blob = await r.blob();
        var url  = URL.createObjectURL(blob);
        if (audioRef.current){
          audioRef.current.src = url;
          await audioRef.current.play();
          audioRef.current.onended = function(){ setPlayingId(null); URL.revokeObjectURL(url); };
        }
        setVoiceLoading(false);
        return;
      } catch {
        localStorage.setItem('el_unavailable','1');
      }
    }

    // Browser TTS fallback — chunked so it never cuts off
    setVoiceLoading(false);
    speakChunkedTTS(text, function(){ setPlayingId(null); });
  }

  function handleVoiceResult(transcript){
    setInput(transcript);
    inputRef.current?.focus();
  }

  function handleKeyDown(e){
    if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
  }

  function clearChat(){
    if (abortRef.current) abortRef.current.abort();
    window.speechSynthesis.cancel();
    if (audioRef.current){ audioRef.current.pause(); audioRef.current.src=''; }
    setMessages([]); setLoading(false); setPlayingId(null);
    inputRef.current?.focus();
  }

  var canSend = input.trim().length>0 && !loading;

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%', minHeight:0,
      background:'var(--bg,#f8f7ff)',
      paddingBottom: isMobile ? 'env(safe-area-inset-bottom,0px)' : 0,
    }}>
      <style>{`
        @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .chat-input:focus{border-color:rgba(124,92,252,0.5)!important;box-shadow:0 0 0 3px rgba(124,92,252,0.08)!important}
        .send-btn:hover:not(:disabled){transform:scale(1.04);box-shadow:0 4px 16px rgba(124,92,252,0.35)}
        .suggestion-btn:hover{background:rgba(124,92,252,0.12)!important;border-color:rgba(124,92,252,0.5)!important}
        .chat-scroll::-webkit-scrollbar{width:4px}
        .chat-scroll::-webkit-scrollbar-track{background:transparent}
        .chat-scroll::-webkit-scrollbar-thumb{background:rgba(124,92,252,0.2);border-radius:4px}
      `}</style>

      {/* Header */}
      <div style={{
        padding:isMobile?'12px 14px 10px':'14px 20px 12px',
        background:'var(--card,#fff)', borderBottom:'1px solid var(--border,#e8e3ff)',
        display:'flex', alignItems:'center', gap:'12px', flexShrink:0,
        boxShadow:'0 1px 0 rgba(124,92,252,0.08)',
      }}>
        <div style={{
          width:'40px', height:'40px', borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg,#7c5cfc,#fc5cf8)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 3px 10px rgba(124,92,252,0.3)',
        }}><ButterflyMini size={24}/></div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:isMobile?'15px':'16px', color:'var(--text,#1a1a2e)' }}>AI Coach</div>
          <div style={{ fontSize:'11px', color:'var(--muted,#8b7ec8)' }}>
            {isMobile?'Real answers, not deflections':'Ask anything · Real answers only · VADER active'}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {/* ── Persona dropdown ── */}
          <select value={persona}
            onChange={function(e){
              setPersona(e.target.value);
              localStorage.setItem('coaching_persona', e.target.value);
            }}
            style={{
              padding:'6px 10px', borderRadius:9,
              border:'1px solid var(--border,#e0d8ff)',
              background:'var(--card,#fff)', color:'var(--text,#1a1a2e)',
              fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700,
              cursor:'pointer', outline:'none', maxWidth:120,
            }}>
            <option value="mentor">🎓 Mentor</option>
            <option value="coach">💼 Coach</option>
            <option value="friend">🤝 Friend</option>
            <option value="motivational">🔥 Hype</option>
            
          </select>
          <div style={{ fontSize:'10px', fontWeight:'700', color:'#4ade80', background:'rgba(74,222,128,0.1)', padding:'3px 8px', borderRadius:'8px', flexShrink:0 }}>● LIVE</div>
          {messages.length>0 && (
            <button onClick={clearChat} style={{
              padding:'5px 10px', borderRadius:'8px', border:'1px solid var(--border,#e0d8ff)',
              background:'transparent', color:'var(--muted,#8b7ec8)',
              fontSize:'10px', fontWeight:'700', cursor:'pointer', fontFamily:"'Syne',sans-serif",
            }}>Clear</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-scroll" style={{
        flex:1, overflowY:'auto', overflowX:'hidden',
        padding:isMobile?'12px':'20px',
        display:'flex', flexDirection:'column', gap:'14px', minHeight:0,
        WebkitOverflowScrolling:'touch',
      }}>
        {messages.length===0 && (
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            flex:1, textAlign:'center', padding:isMobile?'16px 12px':'24px 20px',
          }}>
            <div style={{ fontSize:isMobile?'40px':'52px', marginBottom:'14px' }}>🌟</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:isMobile?'16px':'20px', color:'var(--text,#1a1a2e)', marginBottom:'8px' }}>What's on your mind?</div>
            <div style={{ fontSize:isMobile?'12px':'13px', color:'var(--muted,#8b7ec8)', marginBottom:'24px', lineHeight:'1.6', maxWidth:isMobile?'280px':'340px' }}>
              Ask for project ideas, a roadmap, or share how you feel.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:'8px', width:'100%', maxWidth:'420px' }}>
              {QUICK_SUGGESTIONS.map(function(s,i){
                return (
                  <button key={i} className="suggestion-btn"
                    onClick={function(){ sendMessage(s.replace(/^[^ ]+ /,'')); }}
                    style={{
                      padding:isMobile?'10px 14px':'11px 16px', borderRadius:'14px',
                      border:'1px solid rgba(124,92,252,0.25)', background:'rgba(124,92,252,0.05)',
                      color:'var(--text,#1a1a2e)', fontSize:'12px', cursor:'pointer',
                      fontFamily:"'DM Sans',sans-serif", textAlign:'left', lineHeight:'1.4',
                      transition:'all 0.15s', WebkitTapHighlightColor:'transparent',
                    }}>{s}</button>
                );
              })}
            </div>
          </div>
        )}
        {messages.map(function(msg){
          return <MessageBubble key={msg.id} msg={msg} onSpeak={speakText} playingId={playingId} voiceLoading={voiceLoading}/>;
        })}
        {loading && <TypingDots/>}
        <div ref={bottomRef} style={{ height:'4px' }}/>
      </div>

      {/* Input */}
      <div style={{
        padding:isMobile?'10px 12px 12px':'12px 20px 16px',
        background:'var(--card,#fff)', borderTop:'1px solid var(--border,#e8e3ff)',
        flexShrink:0, boxShadow:'0 -1px 0 rgba(124,92,252,0.06)',
      }}>
        <div style={{ marginBottom:'8px' }}>
          <VoiceInput onResult={handleVoiceResult} disabled={loading}/>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
          <textarea ref={inputRef} value={input}
            onChange={function(e){
              setInput(e.target.value);
              e.target.style.height='auto';
              e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={isMobile?'Ask anything or share how you feel…':"Ask for ideas, roadmap, advice — or share how you're feeling…"}
            disabled={loading} rows={1} className="chat-input"
            style={{
              flex:1, padding:'11px 14px', borderRadius:'14px',
              border:'1px solid var(--border,#e0d8ff)', background:'var(--bg,#f8f7ff)',
              color:'var(--text,#1a1a2e)', fontSize:isMobile?'15px':'14px',
              fontFamily:"'DM Sans',sans-serif", outline:'none',
              transition:'border-color 0.2s,box-shadow 0.2s',
              resize:'none', lineHeight:'1.5', maxHeight:'120px', WebkitAppearance:'none',
            }}/>
          <button onClick={function(){ sendMessage(); }} disabled={!canSend} className="send-btn"
            style={{
              padding:isMobile?'11px 14px':'11px 18px', borderRadius:'14px', border:'none',
              background:canSend?'linear-gradient(135deg,#7c5cfc,#9c7cfc)':'rgba(124,92,252,0.25)',
              color:'#fff', cursor:canSend?'pointer':'not-allowed',
              display:'flex', alignItems:'center', gap:'6px', fontWeight:'700', fontSize:'14px',
              fontFamily:"'Syne',sans-serif", flexShrink:0, transition:'all 0.2s',
              minWidth:isMobile?'46px':'52px', justifyContent:'center', WebkitTapHighlightColor:'transparent',
            }} aria-label="Send message">
            {loading?<Loader size={16} style={{animation:'spin 1s linear infinite'}}/>:<Send size={16}/>}
          </button>
        </div>
        {!isMobile && (
          <div style={{ marginTop:'6px', fontSize:'10px', color:'var(--muted,#8b7ec8)', fontFamily:"'DM Sans',sans-serif" }}>
            💡 Enter to send · Shift+Enter for new line · Change voice in Settings
          </div>
        )}
      </div>
      <audio ref={audioRef} style={{ display:'none' }} crossOrigin="anonymous"/>
    </div>
  );
}

