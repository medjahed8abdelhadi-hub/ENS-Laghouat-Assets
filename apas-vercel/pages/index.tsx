import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Play, Pause, RotateCcw, Camera, Sun, Moon, Layers, Target, TrendingUp, Upload, Send, Zap, Globe, Eye, Scan, ChevronDown, Wind, MessageSquare, Maximize2, Minimize2, ChevronRight, ChevronLeft, BookOpen, FlaskConical, X, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import * as THREE from "three";

// ─── API endpoint — goes through our secure Vercel proxy ─────────────────
// The real Anthropic API key lives in ANTHROPIC_API_KEY env var (server-side only)
const API_URL = "/api/anthropic";

const styleEl = typeof document !== "undefined" ? document.createElement("style") : null;
if (styleEl) {
  styleEl.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes ringX{from{transform:scale(.3);opacity:.7}to{transform:scale(2.8);opacity:0}}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes textReveal{from{opacity:0;letter-spacing:22px}to{opacity:1;letter-spacing:6px}}
  @keyframes open{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes slideL{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideR{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:translateX(0)}}
  @keyframes predCard{0%{opacity:0;transform:translateY(14px) scale(.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes btnPop{0%{transform:scale(1)}40%{transform:scale(.91)}100%{transform:scale(1)}}
  @keyframes modalSlide{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes termPop{from{opacity:0;transform:scale(.88) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes deepSlide{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
  @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(128,128,128,.2);border-radius:4px}
  input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;outline:none;cursor:pointer}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;cursor:pointer;border:2.5px solid #111;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:transform .15s}
  input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.25)}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
  input[type=number]{-moz-appearance:textfield}
  select{appearance:none;-webkit-appearance:none}
  .apas-btn{transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .15s,background .15s,opacity .15s}
  .apas-btn:active{animation:btnPop .22s cubic-bezier(.34,1.56,.64,1)}
  .apas-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(128,128,128,.15)}
  .term-token{cursor:pointer;border-bottom:1.5px dashed;padding:0 2px;border-radius:2px;transition:all .15s;font-weight:700;font-family:'IBM Plex Mono',monospace}
  .term-token:hover{opacity:.6}
  .eq-row:hover{background:rgba(128,128,128,.04)!important}
  .latex-block{display:block;text-align:center;padding:10px 16px;margin:8px 0;border-radius:8px;font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:.5px;overflow-x:auto}
  .latex-inline{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;padding:1px 5px;border-radius:4px}
  .deep-step{animation:deepSlide .4s ease both}
  .skeleton{background:linear-gradient(90deg,rgba(128,128,128,.1) 25%,rgba(128,128,128,.2) 50%,rgba(128,128,128,.1) 75%);background-size:400px 100%;animation:shimmer 1.4s infinite}
`;
  if (typeof document !== "undefined") document.head.appendChild(styleEl);
}

// ─── Types ────────────────────────────────────────────────────────────────
interface TrajectoryPoint{x:number;y:number;vx:number;vy:number;t:number;v:number;ax:number;ay:number}
interface SimParams{v0:number;angle:number;g:number;mass:number;h0:number;kDrag:number}
interface Predictions{range:number;maxH:number;tF:number;conf:number}
interface Bounds{xMax:number;yMax:number}
interface SoundFunctions{click:()=>void;launch:()=>void;land:()=>void;apex:()=>void;success:()=>void;scan:()=>void;toggle:()=>void;enter:()=>void;next:()=>void}
interface PhysicsData{estimatedMass?:string;estimatedDiameter?:string;material?:string;typicalVelocity?:string;dragCoefficient?:string;launchAngleTypical?:string;maxRangeTypical?:string;interestingFact?:string}
interface ScanResult{hasProjectile:boolean;projectileType?:string;imageDescription:string;confidence:number;physicsData?:PhysicsData;suggestedSimParams?:{v0:number;angle:number;mass:number}}
interface TermDef{symbol:string;name:string;unit:string;color:string;definition:string;steps:string[]}
type TermDefsMap=Record<string,TermDef>
interface DisplayOptions{crit:boolean;fvec:boolean;comp:boolean}
interface TheoVals{range:string;maxH:string;tF:string}
interface ChatMessage{role:"user"|"ai"|"system";text:string}
interface EqValsResult{rad:number;vx0:number;vy0:number;fg:number;fd0:number;hasAir:boolean;ax0:number;ay0:number;a0:number;tApex:number;range:number;maxH:number;tF:number}
interface ErrResult{abs:string;rel:string;good:boolean;warn:boolean}
interface ErrMetric{key:keyof TheoVals;label:string;unit:string;aiVal:number;desc:string}
type BtnVariant="ghost"|"primary"|"success"
type CatRow=[string,string,string,string,string,string]
interface Category{label:string;color:string;icon:string;rows:CatRow[]}
interface StepItem{num:string;icon:string;title:string;badge:string;content:ReactNode}
interface DeepExplainState{open:boolean;loading:boolean;content:string;title:string}

// ─── LaTeX renderer ───────────────────────────────────────────────────────
function processLatex(s:string):string{
  return s
    .replace(/\\theta/g,"θ").replace(/\\alpha/g,"α").replace(/\\beta/g,"β")
    .replace(/\\pi/g,"π").replace(/\\Delta/g,"Δ").replace(/\\delta/g,"δ")
    .replace(/\\omega/g,"ω").replace(/\\Omega/g,"Ω").replace(/\\mu/g,"μ")
    .replace(/\\rho/g,"ρ").replace(/\\lambda/g,"λ").replace(/\\sigma/g,"σ")
    .replace(/\\cdot/g,"·").replace(/\\times/g,"×").replace(/\\div/g,"÷")
    .replace(/\\approx/g,"≈").replace(/\\neq/g,"≠").replace(/\\leq/g,"≤").replace(/\\geq/g,"≥")
    .replace(/\\infty/g,"∞").replace(/\\pm/g,"±").replace(/\\sum/g,"Σ").replace(/\\int/g,"∫")
    .replace(/\\cos/g,"cos").replace(/\\sin/g,"sin").replace(/\\tan/g,"tan")
    .replace(/\\sqrt\{([^}]+)\}/g,"√($1)")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,"($1)/($2)")
    .replace(/\^\{([^}]+)\}/g,"<sup>$1</sup>")
    .replace(/\^(\w)/g,"<sup>$1</sup>")
    .replace(/_\{([^}]+)\}/g,"<sub>$1</sub>")
    .replace(/_(\w)/g,"<sub>$1</sub>")
    .replace(/\\left\(/g,"(").replace(/\\right\)/g,")")
    .replace(/\\left\[/g,"[").replace(/\\right\]/g,"]")
    .replace(/\\\\/g,"<br/>");
}

function parseLatexSegments(text:string):{type:"text"|"inline"|"block";content:string}[]{
  const segments:{type:"text"|"inline"|"block";content:string}[]=[];
  const re=/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let last=0,m:RegExpExecArray|null;
  while((m=re.exec(text))!==null){
    if(m.index>last)segments.push({type:"text",content:text.slice(last,m.index)});
    const isBlock=m[0].startsWith("$$");
    const inner=isBlock?m[0].slice(2,-2):m[0].slice(1,-1);
    segments.push({type:isBlock?"block":"inline",content:processLatex(inner)});
    last=m.index+m[0].length;
  }
  if(last<text.length)segments.push({type:"text",content:text.slice(last)});
  return segments;
}

interface LatexTextProps{text:string;dark:boolean;block?:boolean}
function LatexText({text,dark}:LatexTextProps){
  const segs=parseLatexSegments(text);
  const blockBg=dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)";
  const inlineBg=dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.08)";
  const mathCol=dark?"#ffe082":"#c62828";
  return(
    <span>
      {segs.map((s,i)=>{
        if(s.type==="block")return(
          <div key={i} className="latex-block" style={{background:blockBg,color:mathCol,border:`1px solid ${dark?"rgba(255,255,255,.12)":"rgba(198,40,40,.2)"}`}} dangerouslySetInnerHTML={{__html:s.content}}/>
        );
        if(s.type==="inline")return(
          <code key={i} className="latex-inline" style={{background:inlineBg,color:mathCol}} dangerouslySetInnerHTML={{__html:s.content}}/>
        );
        return <span key={i}>{s.content.split("\n").map((ln,j)=><span key={j}>{j>0&&<br/>}{ln}</span>)}</span>;
      })}
    </span>
  );
}

// ─── Deep explanation API call — uses proxy ───────────────────────────────
async function fetchDeepExplanation(catLabel:string,params:SimParams,preds:Predictions|null,lang:string):Promise<string>{
  const ev=eqVals(params,preds);
  const f=(n:number)=>n.toFixed(4);

  const systemPrompt=`أنت مدرس فيزياء متخصص وخبير في حركة المقذوفات. مهمتك شرح الحساب الفيزيائي التالي بأسلوب تعليمي عميق ومتدرج يتبع هذه الخطوات الخمس بالضبط:

**الخطوة 1 — التحليل والاستخراج:** كيف استُخلصت المعطيات.
**الخطوة 2 — التأصيل الفيزيائي:** القانون أو المبدأ الفيزيائي المستخدم.
**الخطوة 3 — الاشتقاق الرياضي:** ابدأ بالمعادلة الرمزية، ثم اشتقها خطوة بخطوة. استخدم LaTeX.
**الخطوة 4 — المنطق البرمجي:** كيف يتعامل الكود مع هذا الحساب.
**الخطوة 5 — المعنى الفيزيائي:** ماذا يعني الرقم الناتج في الواقع.

أسلوبك: مدرس خصوصي صبور وذكي. اكتب بالعربية بجمل كاملة. استخدم LaTeX دائماً للمعادلات.`;

  const userMsg=`القسم المطلوب شرحه: **${catLabel}**

المعطيات: V₀=${params.v0}م/ث، θ=${params.angle}°، g=${params.g}م/ث²، m=${params.mass}كغ، k=${params.kDrag}، h₀=${params.h0}م

القيم المحسوبة: Vx₀=${f(ev.vx0)}، Vy₀=${f(ev.vy0)}، Fg=${f(ev.fg)}N، R=${f(ev.range)}م، Hmax=${f(ev.maxH)}م، tF=${f(ev.tF)}ث

اشرح كيف وصلنا لقيم هذا القسم خطوة بخطوة.`;

  const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,system:systemPrompt,messages:[{role:"user",content:userMsg}]})});
  const d=await res.json();
  return(d.content as Array<{text?:string}>)?.map((c:any)=>c.text||"").join("")||"حدث خطأ في الاتصال.";
}

// ─── DeepExplainModal ─────────────────────────────────────────────────────
interface DeepExplainModalProps{state:DeepExplainState;onClose:()=>void;dark:boolean;col:string;bord:string;acc:string;mut:string;ibg:string}
function DeepExplainModal({state,onClose,dark,col,bord,acc,mut}:DeepExplainModalProps){
  if(!state.open)return null;
  const surf=dark?"#0e0e0e":"#ffffff";
  const headBg=dark?"#070707":"#f5f5f5";
  const mathCol=dark?"#ffe082":"#c62828";

  const stepColors=["#1565c0","#2e7d32","#6a1b9a","#e65100","#00695c"];
  const stepIcons=["🔍","⚖️","∫","💻","🎯"];

  const renderContent=()=>{
    if(state.loading)return(
      <div style={{display:"flex",flexDirection:"column",gap:16,padding:"24px 28px"}}>
        {[1,0.8,0.9,0.6,0.7].map((w,i)=>(
          <div key={i}>
            <div className="skeleton" style={{height:16,width:"40%",borderRadius:6,marginBottom:10}}/>
            {[1,0.95,0.7].map((pw,j)=>(
              <div key={j} className="skeleton" style={{height:12,width:(pw*100)+"%",borderRadius:4,marginBottom:6}}/>
            ))}
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,paddingTop:16,color:mut}}>
          <div style={{width:20,height:20,border:`2px solid ${acc}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          <span style={{fontFamily:"IBM Plex Sans",fontSize:13}}>يُولّد الذكاء الاصطناعي الشرح…</span>
        </div>
      </div>
    );

    const lines=state.content.split("\n");
    const blocks:{header:string|null;body:string;idx:number}[]=[];
    let current:{header:string|null;body:string;idx:number}={header:null,body:"",idx:0};
    const stepRe=/^\*?\*?(الخطوة\s*\d+[—–-]?[^*\n]*)\*?\*?/;
    let stepIdx=0;
    for(const line of lines){
      const m=line.match(stepRe);
      if(m){blocks.push({...current});current={header:m[1].replace(/\*\*/g,"").trim(),body:"",idx:stepIdx++};}
      else current.body+=line+"\n";
    }
    blocks.push(current);
    const filtered=blocks.filter(b=>b.body.trim()||b.header);

    return(
      <div style={{padding:"20px 28px",display:"flex",flexDirection:"column",gap:18}}>
        {filtered.map((block,i)=>{
          const ci=block.header?Math.min(block.idx,stepColors.length-1):0;
          const stepColor=stepColors[ci];
          const stepIcon=stepIcons[ci]||"•";
          return(
            <div key={i} className="deep-step" style={{animationDelay:(i*.07)+"s",borderRadius:14,border:`1.5px solid ${block.header?(stepColor+"33"):bord}`,overflow:"hidden",background:dark?"rgba(255,255,255,.02)":"#fff"}}>
              {block.header&&(
                <div style={{padding:"11px 18px",background:dark?stepColor+"18":stepColor+"0d",borderBottom:`1px solid ${stepColor}33`,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:10,background:stepColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,boxShadow:`0 3px 10px ${stepColor}44`}}>{stepIcon}</div>
                  <span style={{fontFamily:"IBM Plex Sans",fontWeight:800,fontSize:14,color:stepColor}}>{block.header}</span>
                </div>
              )}
              {block.body.trim()&&(
                <div style={{padding:"14px 18px",fontFamily:"IBM Plex Sans",fontSize:13.5,lineHeight:2,color:col,direction:"rtl"}}>
                  <LatexText text={block.body.trim()} dark={dark}/>
                </div>
              )}
            </div>
          );
        })}
        <div style={{padding:"12px 16px",borderRadius:10,border:`1px dashed ${mathCol}55`,background:dark?"rgba(255,224,130,.04)":"rgba(198,40,40,.03)",textAlign:"center"}}>
          <span style={{fontFamily:"IBM Plex Mono",fontSize:10,color:mathCol,letterSpacing:1.5}}>✦ APAS DEEP PHYSICS ENGINE ✦</span>
        </div>
      </div>
    );
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:10020,display:"flex",alignItems:"stretch",justifyContent:"flex-end",background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div style={{width:"min(680px,96vw)",background:surf,display:"flex",flexDirection:"column",boxShadow:"-20px 0 60px rgba(0,0,0,.4)",animation:"slideL .35s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 22px",background:headBg,borderBottom:`1px solid ${bord}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{width:38,height:38,borderRadius:12,background:dark?"#eeeeee":"#111",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Sparkles size={18} color={dark?"#000":"#fff"}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Orbitron",fontWeight:800,fontSize:13,color:dark?"#eeeeee":"#111",letterSpacing:1.5}}>الشرح التعليمي العميق</div>
            <div style={{fontFamily:"IBM Plex Mono",fontSize:10,color:mut,letterSpacing:1,marginTop:2}}>قسم: {state.title}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:6,background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)",border:`1px solid ${bord}`}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",animation:"pulse 1.5s infinite"}}/>
            <span style={{fontFamily:"IBM Plex Mono",fontSize:9,color:mut,letterSpacing:1}}>AI POWERED</span>
          </div>
          <button onClick={onClose} style={{background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",border:`1px solid ${bord}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",color:dark?"#eeeeee":"#111"}}><X size={14}/></button>
        </div>
        {!state.loading&&state.content&&(
          <div style={{padding:"8px 22px",borderBottom:`1px solid ${bord}`,display:"flex",gap:8,flexWrap:"wrap",background:dark?"rgba(255,255,255,.02)":"rgba(0,0,0,.02)",flexShrink:0}}>
            {[["🔍","الاستخراج"],["⚖️","التأصيل"],["∫","الاشتقاق"],["💻","البرمجة"],["🎯","المعنى"]].map(([ic,lb])=>(
              <span key={lb} style={{fontFamily:"IBM Plex Sans",fontSize:10.5,color:mut,display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:11}}>{ic}</span>{lb}</span>
            ))}
          </div>
        )}
        <div style={{flex:1,overflowY:"auto"}}>{renderContent()}</div>
        <div style={{padding:"10px 22px",borderTop:`1px solid ${bord}`,background:headBg,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontFamily:"IBM Plex Mono",fontSize:9.5,color:mut,letterSpacing:1}}>المعادلات مُنسَّقة بـ LaTeX ✦</span>
          <button onClick={onClose} style={{padding:"8px 20px",borderRadius:8,background:dark?"#eeeeee":"#111",border:"none",color:dark?"#000":"#fff",fontFamily:"IBM Plex Sans",fontSize:12,fontWeight:700,cursor:"pointer"}}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sounds ───────────────────────────────────────────────────────────────
function useSounds():SoundFunctions{
  const r=useRef<AudioContext|null>(null);
  const g=():AudioContext=>{const Ctx:any=typeof window!=="undefined"?(window.AudioContext||(window as any).webkitAudioContext):null;if(!Ctx)return null as any;if(!r.current)r.current=new Ctx();if(r.current.state==="suspended")r.current.resume();return r.current;};
  const osc=(freq:number,type:OscillatorType,dur:number,vol:number,delay=0,freqEnd?:number):void=>{try{const c=g();if(!c)return;const o=c.createOscillator(),gn=c.createGain();o.connect(gn);gn.connect(c.destination);o.type=type;o.frequency.setValueAtTime(freq,c.currentTime+delay);if(freqEnd)o.frequency.exponentialRampToValueAtTime(freqEnd,c.currentTime+delay+dur);gn.gain.setValueAtTime(vol,c.currentTime+delay);gn.gain.exponentialRampToValueAtTime(0.001,c.currentTime+delay+dur);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+dur);}catch{}};
  const noise=(dur:number,vol:number):void=>{try{const c=g();if(!c)return;const buf=c.createBuffer(1,c.sampleRate*dur,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(c.sampleRate*.04));const s=c.createBufferSource(),gn=c.createGain();s.buffer=buf;s.connect(gn);gn.connect(c.destination);gn.gain.value=vol;s.start();}catch{}};
  return{click:()=>osc(900,"sine",.07,.07),launch:()=>{osc(180,"sawtooth",.45,.18,0,70);osc(300,"sine",.2,.08)},land:()=>noise(.18,.28),apex:()=>{osc(1400,"sine",.35,.09);osc(1800,"sine",.2,.05,.1)},success:()=>[523,659,784,1047].forEach((f,i)=>osc(f,"sine",.18,.07,i*.09)),scan:()=>[500,700,900,1100].forEach((f,i)=>osc(f,"sine",.08,.05,i*.09)),toggle:()=>osc(600,"sine",.06,.05),enter:()=>{[200,400,600,900].forEach((f,i)=>osc(f,"sine",.18,.06,i*.08));osc(1200,"sine",.4,.05,.35)},next:()=>osc(750,"sine",.08,.06)};
}

// ─── Physics helpers ──────────────────────────────────────────────────────
function computeTrajectory({v0,angle,g,mass,h0,kDrag}:SimParams):TrajectoryPoint[]{
  const RESTITUTION=0.45,FRICTION=0.75,MIN_VY=1.8,MAX_BOUNCES=4;
  const rad=angle*Math.PI/180,k=kDrag/Math.max(mass,.01),dt=.02;
  let x=0,y=h0,vx=v0*Math.cos(rad),vy=v0*Math.sin(rad),t=0;
  const pts:TrajectoryPoint[]=[];let bounces=0;
  for(let i=0;i<18000;i++){const v=Math.sqrt(vx*vx+vy*vy),ax=-k*v*vx,ay=-g-k*v*vy;pts.push({x,y:Math.max(0,y),vx,vy,t,v,ax,ay});vx+=ax*dt;vy+=ay*dt;x+=vx*dt;y+=vy*dt;t+=dt;if(y<0&&i>2){if(bounces<MAX_BOUNCES&&Math.abs(vy)>MIN_VY){y=0;vy=-vy*RESTITUTION;vx=vx*FRICTION;bounces++;}else{pts.push({x,y:0,vx:0,vy:0,t,v:0,ax:0,ay:0});break;}}}
  return pts;
}
function computeBounds(traj:TrajectoryPoint[],h0:number):Bounds{let xMax=1,yMax=Math.max(h0,1);for(const p of traj){if(p.x>xMax)xMax=p.x;if(p.y>yMax)yMax=p.y;}return{xMax:xMax*1.12,yMax:yMax*1.18};}
function getVarVal(p:TrajectoryPoint,name:string,mass:number,g:number):number{const vals:Record<string,number>={t:+p.t.toFixed(3),X:+p.x.toFixed(3),Y:+Math.max(0,p.y).toFixed(3),V:+p.v.toFixed(3),Vx:+p.vx.toFixed(3),Vy:+p.vy.toFixed(3),A:+Math.sqrt((p.ax||0)**2+(p.ay||0)**2).toFixed(3),E:+(0.5*mass*p.v**2+mass*g*Math.max(0,p.y)).toFixed(2)};return vals[name]??0;}
function eqVals(p:SimParams,preds:Predictions|null):EqValsResult{const rad=p.angle*Math.PI/180,vx0=p.v0*Math.cos(rad),vy0=p.v0*Math.sin(rad),fg=p.mass*p.g,hasAir=p.kDrag>0,fd0=hasAir?p.kDrag*p.v0**2:0,ax0=hasAir?-(p.kDrag/p.mass)*p.v0*vx0:0,ay0=-p.g-(hasAir?(p.kDrag/p.mass)*p.v0*vy0:0),a0=Math.sqrt(ax0**2+ay0**2),tApex=vy0/p.g,range=preds?.range??(vx0*(vy0+Math.sqrt(Math.max(0,vy0*vy0+2*p.g*p.h0)))/p.g),maxH=preds?.maxH??(p.h0+vy0*vy0/(2*p.g)),tF=preds?.tF??((vy0+Math.sqrt(Math.max(0,vy0*vy0+2*p.g*p.h0)))/p.g);return{rad,vx0,vy0,fg,fd0,hasAir,ax0,ay0,a0,tApex,range,maxH,tF};}
function getTermDefs(p:SimParams,preds:Predictions|null):TermDefsMap{const ev=eqVals(p,preds),f=(n:number)=>n.toFixed(4);return{"V₀":{symbol:"V₀",name:"السرعة الابتدائية",unit:"م/ث",color:"#111",definition:"مقدار متجه السرعة عند لحظة الإطلاق t=0.",steps:["<b>القيمة:</b> V₀ = <b>"+p.v0+"</b> م/ث","Vx₀ = V₀·cos(θ)  و  Vy₀ = V₀·sin(θ)","<b>∴ V₀ = "+p.v0+" م/ث</b>"]},"θ":{symbol:"θ",name:"زاوية الإطلاق",unit:"درجة → راديان",color:"#111",definition:"الزاوية بين متجه السرعة الابتدائية والمستوى الأفقي.",steps:["θ = "+p.angle+"°","θ_rad = "+p.angle+" × (π/180) = <b>"+f(ev.rad)+"</b> rad","cos(θ) = "+f(Math.cos(ev.rad))+"  sin(θ) = "+f(Math.sin(ev.rad))]},"m":{symbol:"m",name:"الكتلة",unit:"كغ",color:"#111",definition:"كتلة المقذوف.",steps:["m = <b>"+p.mass+"</b> كغ"]},"g":{symbol:"g",name:"تسارع الجاذبية",unit:"م/ث²",color:"#111",definition:"تسارع السقوط الحر.",steps:["g = <b>"+p.g+"</b> م/ث²"]},"k":{symbol:"k",name:"معامل السحب",unit:"كغ/م",color:"#111",definition:"معامل مقاومة الوسط.",steps:["k = <b>"+p.kDrag+"</b> كغ/م",ev.hasAir?"عند V₀: Fd = "+p.kDrag+"×"+p.v0+"² = <b>"+f(ev.fd0)+"</b> N":"k = 0 → لا مقاومة"]},"h₀":{symbol:"h₀",name:"الارتفاع الابتدائي",unit:"م",color:"#111",definition:"ارتفاع نقطة الإطلاق.",steps:["h₀ = <b>"+p.h0+"</b> م"]},"Vx₀":{symbol:"Vx₀",name:"المركبة الأفقية",unit:"م/ث",color:"#333",definition:"إسقاط السرعة على المحور الأفقي.",steps:["Vx₀ = V₀·cos(θ) = "+p.v0+"×"+f(Math.cos(ev.rad)),"<b>∴ Vx₀ = "+f(ev.vx0)+" م/ث</b>"]},"Vy₀":{symbol:"Vy₀",name:"المركبة الرأسية",unit:"م/ث",color:"#333",definition:"إسقاط السرعة على المحور الرأسي.",steps:["Vy₀ = V₀·sin(θ) = "+p.v0+"×"+f(Math.sin(ev.rad)),"<b>∴ Vy₀ = "+f(ev.vy0)+" م/ث</b>"]},"Fg":{symbol:"Fg",name:"قوة الجاذبية",unit:"N",color:"#444",definition:"القوة الشاقولية.",steps:["Fg = m·g = "+p.mass+"×"+p.g,"<b>∴ Fg = "+f(ev.fg)+" N</b>"]},"Fd":{symbol:"Fd",name:"قوة السحب",unit:"N",color:"#444",definition:"مقاومة الهواء.",steps:["Fd = k·V²",ev.hasAir?"<b>∴ Fd = "+f(ev.fd0)+" N</b>":"<b>k = 0 → Fd = 0 N</b>"]},"R":{symbol:"R",name:"المدى الأفقي",unit:"م",color:"#111",definition:"المسافة الأفقية الكلية.",steps:["R = x_final","<b>∴ R = "+f(ev.range)+" م</b>"]},"Hmax":{symbol:"Hmax",name:"أقصى ارتفاع",unit:"م",color:"#111",definition:"أعلى نقطة يصلها المقذوف.",steps:["Hmax = h₀+Vy₀²/(2g)","<b>∴ Hmax = "+f(ev.maxH)+" م</b>"]},"tF":{symbol:"tF",name:"زمن الرحلة الكلي",unit:"ث",color:"#111",definition:"الزمن من الإطلاق حتى التوقف.",steps:["<b>∴ tF = "+f(ev.tF)+" ث</b>"]}};}

// ─── AI helpers — all use /api/anthropic proxy ────────────────────────────
async function analyzeImage(b64:string,mime:string,lang:string):Promise<ScanResult>{
  const ar=lang==="ar";
  const sys=ar?`أنت APAS Vision AI. أجب فقط بـ JSON صحيح:{"hasProjectile":bool,"projectileType":"نوع","imageDescription":"وصف","confidence":num,"physicsData":{"estimatedMass":"...","estimatedDiameter":"...","material":"...","typicalVelocity":"...","dragCoefficient":"...","launchAngleTypical":"...","maxRangeTypical":"...","interestingFact":"..."},"suggestedSimParams":{"v0":num,"angle":num,"mass":num}}`:`You are APAS Vision AI. Reply ONLY valid JSON:{"hasProjectile":bool,"projectileType":"type","imageDescription":"desc","confidence":num,"physicsData":{"estimatedMass":"...","estimatedDiameter":"...","material":"...","typicalVelocity":"...","dragCoefficient":"...","launchAngleTypical":"...","maxRangeTypical":"...","interestingFact":"..."},"suggestedSimParams":{"v0":num,"angle":num,"mass":num}}`;
  const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,system:sys,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime,data:b64}},{type:"text",text:ar?"حلل الصورة.":"Analyze image."}]}]})});
  const d=await res.json();
  const txt=(d.content as Array<{text?:string}>)?.map((c:any)=>c.text||"").join("")||"{}";
  try{return JSON.parse(txt.replace(/```json|```/g,"").trim());}catch{return{hasProjectile:false,imageDescription:ar?"فشل التحليل.":"Analysis failed.",confidence:0};}
}

async function chatAI(history:ChatMessage[],params:SimParams,lang:string):Promise<string>{
  const ar=lang==="ar";
  const sys=ar?("أنت APAS Physics AI. v0="+params.v0+"م/ث، θ="+params.angle+"°. أجب بالعربية."):("You are APAS Physics AI. v0="+params.v0+"m/s, θ="+params.angle+"°. Be concise.");
  const msgs=history.filter(m=>m.role!=="system").slice(-10).map(m=>({role:(m.role==="ai"?"assistant":"user") as "user"|"assistant",content:m.text}));
  const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:sys,messages:msgs})});
  const d=await res.json();
  return(d.content as Array<{text?:string}>)?.map((c:any)=>c.text||"").join("")||"Error.";
}

// ─── Three.js sprite helper ────────────────────────────────────────────────
function makeTextSprite(text:string,color:string):THREE.Sprite{const canvas=document.createElement("canvas");canvas.width=256;canvas.height=64;const ctx=canvas.getContext("2d")!;ctx.clearRect(0,0,256,64);ctx.font="bold 28px 'IBM Plex Mono',monospace";ctx.fillStyle=color;ctx.fillText(text,8,44);const tex=new THREE.CanvasTexture(canvas);const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});const sprite=new THREE.Sprite(mat);sprite.scale.set(6,1.5,1);return sprite;}

// ─── Projectile3DInline ───────────────────────────────────────────────────
interface P3DProps{points:TrajectoryPoint[];showFvec:boolean;params:SimParams;lang:string;frame3DRef:React.MutableRefObject<number>;playing3DRef:React.MutableRefObject<boolean>;speed3DRef:React.MutableRefObject<number>;onFrameTick:(fi:number)=>void;onEnd3D:()=>void}
function Projectile3DInline({points,showFvec,params,lang,frame3DRef,playing3DRef,speed3DRef,onFrameTick,onEnd3D}:P3DProps){
  const mountRef=useRef<HTMLDivElement>(null);
  const fvecRef=useRef(showFvec);
  useEffect(()=>{fvecRef.current=showFvec;},[showFvec]);
  const [hud,setHud]=useState<{x:string;y:string;vx:string;vy:string;v:string;t:string}|null>(null);
  useEffect(()=>{
    const el=mountRef.current;if(!el||points.length<2)return;
    let rafBoot=0;let cleanupFn:(()=>void)|null=null;
    rafBoot=requestAnimationFrame(()=>{
      const W=Math.max(el.clientWidth,el.offsetWidth,el.getBoundingClientRect().width,100);
      const H=Math.max(el.clientHeight,el.offsetHeight,el.getBoundingClientRect().height,460);
      const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(window.devicePixelRatio);renderer.setSize(W,H);renderer.setClearColor(0xf0f4ff);renderer.shadowMap.enabled=true;el.appendChild(renderer.domElement);
      const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(50,W/H,0.1,2000);
      const maxX=Math.max(...points.map(p=>p.x),1),maxY=Math.max(...points.map(p=>p.y),1),sc=36/Math.max(maxX,maxY);
      const toV3=(p:TrajectoryPoint):THREE.Vector3=>new THREE.Vector3(p.x*sc,p.y*sc,0);
      const vecs=points.map(toV3);const midX=(maxX*sc)/2;const lookAt=new THREE.Vector3(midX,(maxY*sc)/3,0);
      const sph={th:Math.PI*0.3,ph:Math.PI*0.28,r:Math.max(maxX,maxY)*sc*1.8+20};
      const updateCam=():void=>{camera.position.set(lookAt.x+sph.r*Math.sin(sph.ph)*Math.sin(sph.th),lookAt.y+sph.r*Math.cos(sph.ph),lookAt.z+sph.r*Math.sin(sph.ph)*Math.cos(sph.th));camera.lookAt(lookAt);};updateCam();
      scene.add(new THREE.AmbientLight(0xffffff,1.3));const sun=new THREE.DirectionalLight(0xffffff,1.0);sun.position.set(40,80,40);sun.castShadow=true;scene.add(sun);
      const axLen=Math.max(maxX,maxY)*sc*1.25+4;scene.add(new THREE.AxesHelper(axLen));
      const xLbl=makeTextSprite("X (م)","#cc2200");xLbl.position.set(axLen+2,0,0);scene.add(xLbl);
      const yLbl=makeTextSprite("Y (م)","#007722");yLbl.position.set(0,axLen+2,0);scene.add(yLbl);
      const gridSize=Math.ceil(Math.max(maxX,maxY)*sc/10)*10+10;const gridDiv=Math.round(gridSize/2);
      const grid=new THREE.GridHelper(gridSize,gridDiv,0x8899cc,0xaabbdd);grid.position.set(gridSize/2,0,0);scene.add(grid);
      const tickStep=Math.max(1,Math.round(Math.max(maxX,maxY)/8));
      for(let v=0;v<=Math.ceil(maxX)+tickStep;v+=tickStep){const sp=makeTextSprite(v+"م","#334466");sp.position.set(v*sc,-1.5,0);sp.scale.set(3.5,0.9,1);scene.add(sp);}
      for(let v=tickStep;v<=Math.ceil(maxY)+tickStep;v+=tickStep){const sp=makeTextSprite(v+"م","#334466");sp.position.set(-3,v*sc,0);sp.scale.set(3.5,0.9,1);scene.add(sp);}
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(gridSize*2,gridSize*2),new THREE.MeshStandardMaterial({color:0xe8eef8,metalness:0,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(gridSize/2,-0.01,0);ground.receiveShadow=true;scene.add(ground);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vecs),new THREE.LineBasicMaterial({color:0x8899bb,transparent:true,opacity:0.4})));
      const launchMesh=new THREE.Mesh(new THREE.SphereGeometry(0.35,16,16),new THREE.MeshStandardMaterial({color:0x00897b,emissive:0x003322,emissiveIntensity:0.4}));launchMesh.position.set(0,0,0);scene.add(launchMesh);
      const originRing=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.08,8,32),new THREE.MeshBasicMaterial({color:0x00bfa5,transparent:true,opacity:0.6}));originRing.position.set(0,0,0);originRing.rotation.x=Math.PI/2;scene.add(originRing);
      const lv=vecs[vecs.length-1];const landMesh=new THREE.Mesh(new THREE.CylinderGeometry(0,0.8,1.6,4),new THREE.MeshStandardMaterial({color:0xc62828,emissive:0x3e0000,emissiveIntensity:0.5}));landMesh.position.set(lv.x,0.8,0);scene.add(landMesh);
      let wasAbove=points[0].y>0.3;for(let i=1;i<points.length-1;i++){const above=points[i].y>0.3;if(wasAbove&&!above){const bpos=vecs[i];const ring=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.1,6,28),new THREE.MeshBasicMaterial({color:0xff6633,transparent:true,opacity:0.55}));ring.position.set(bpos.x,0.05,0);ring.rotation.x=Math.PI/2;scene.add(ring);}wasAbove=above;}
      const ballMat=new THREE.MeshStandardMaterial({color:0x1a237e,metalness:0.5,roughness:0.25,emissive:0x0d1445,emissiveIntensity:0.2});const ball=new THREE.Mesh(new THREE.SphereGeometry(0.45,24,24),ballMat);ball.castShadow=true;ball.position.copy(vecs[0]);scene.add(ball);
      const ballLight=new THREE.PointLight(0x3344aa,0.5,16);scene.add(ballLight);
      const shadowDisc=new THREE.Mesh(new THREE.CircleGeometry(0.55,20),new THREE.MeshBasicMaterial({color:0x000033,transparent:true,opacity:0.22}));shadowDisc.rotation.x=-Math.PI/2;shadowDisc.position.y=0.005;scene.add(shadowDisc);
      const trailMat=new THREE.MeshPhongMaterial({color:0x1565c0,transparent:true,opacity:0.7});let trailMesh:THREE.Mesh|null=null;
      function buildTube(path:THREE.Vector3[]):THREE.BufferGeometry{if(path.length<2)return new THREE.BufferGeometry();const curve=new THREE.CatmullRomCurve3(path);return new THREE.TubeGeometry(curve,Math.max(path.length*2,6),0.1,8,false);}
      const gravArrow=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(),5,0xd32f2f,1.2,0.55);const velArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),7,0x1b5e20,1.5,0.65);const dragArrow=new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(),4,0x0d47a1,1.0,0.5);const vxArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),4,0x00838f,1.0,0.45);const vyArrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),4,0x6a1b9a,1.0,0.45);[gravArrow,velArrow,dragArrow,vxArrow,vyArrow].forEach(a=>{a.visible=false;scene.add(a);});
      let drag=false,pm={x:0,y:0};const onMD=(e:MouseEvent):void=>{drag=true;pm={x:e.clientX,y:e.clientY};};const onMU=():void=>{drag=false;};const onMM=(e:MouseEvent):void=>{if(!drag)return;sph.th-=(e.clientX-pm.x)*0.007;sph.ph=Math.max(0.05,Math.min(Math.PI/2-0.02,sph.ph+(e.clientY-pm.y)*0.007));pm={x:e.clientX,y:e.clientY};updateCam();};const onWh=(e:WheelEvent):void=>{sph.r=Math.max(5,Math.min(400,sph.r+e.deltaY*0.08));updateCam();};
      renderer.domElement.addEventListener("mousedown",onMD);window.addEventListener("mouseup",onMU);window.addEventListener("mousemove",onMM);renderer.domElement.addEventListener("wheel",onWh,{passive:true});
      let aid=0,tickCount=0;
      const animate=():void=>{aid=requestAnimationFrame(animate);if(playing3DRef.current){const step=Math.max(1,Math.round(speed3DRef.current*2));const next=Math.min(frame3DRef.current+step,points.length-1);frame3DRef.current=next;tickCount++;if(tickCount%6===0)onFrameTick(next);if(next>=points.length-1){playing3DRef.current=false;onEnd3D();}}const fi=Math.min(frame3DRef.current,points.length-1);const pos=vecs[fi];const pt=points[fi];ball.position.copy(pos);ballLight.position.copy(pos);ballMat.emissiveIntensity=0.15+0.1*Math.sin(Date.now()*0.004);const hf=1-Math.min(pos.y/(maxY*sc+1),0.92);shadowDisc.position.set(pos.x,0.005,0);shadowDisc.scale.setScalar(hf);if(trailMesh){scene.remove(trailMesh);trailMesh.geometry.dispose();trailMesh=null;}const tv=vecs.slice(Math.max(0,fi-40),fi+1);if(tv.length>=2){trailMesh=new THREE.Mesh(buildTube(tv),trailMat);scene.add(trailMesh);}originRing.rotation.z+=0.01;const sf=fvecRef.current;const spd=pt.v;const base=Math.max(maxY*sc*0.18,5);if(sf){gravArrow.position.copy(pos);gravArrow.setLength(base*0.55,base*0.14,base*0.08);gravArrow.visible=true;if(spd>0.3){const vd=new THREE.Vector3(pt.vx/spd,pt.vy/spd,0);velArrow.setDirection(vd);const vl=base*Math.min((spd/Math.max(params.v0,1))*1.6,1.4);velArrow.setLength(vl,vl*0.22,vl*0.12);velArrow.position.copy(pos);velArrow.visible=true;const vxd=new THREE.Vector3(pt.vx>=0?1:-1,0,0);vxArrow.setDirection(vxd);const vxl=base*Math.min((Math.abs(pt.vx)/Math.max(params.v0,1))*1.4,1.0);vxArrow.setLength(vxl,vxl*0.2,vxl*0.11);vxArrow.position.copy(pos);vxArrow.visible=Math.abs(pt.vx)>0.2;const vyd=new THREE.Vector3(0,pt.vy>=0?1:-1,0);vyArrow.setDirection(vyd);const vyl=base*Math.min((Math.abs(pt.vy)/Math.max(params.v0,1))*1.4,1.0);vyArrow.setLength(vyl,vyl*0.2,vyl*0.11);vyArrow.position.copy(pos);vyArrow.visible=Math.abs(pt.vy)>0.2;if(params.kDrag>0){const dd=new THREE.Vector3(-pt.vx/spd,-pt.vy/spd,0);dragArrow.setDirection(dd);const fd=params.kDrag*spd*spd,dl=base*Math.min((fd/Math.max(params.mass*params.g,0.01))*0.6,0.9);dragArrow.setLength(Math.max(dl,1.2),Math.max(dl*0.22,0.3),Math.max(dl*0.12,0.18));dragArrow.position.copy(pos);dragArrow.visible=true;}else dragArrow.visible=false;}else{velArrow.visible=false;vxArrow.visible=false;vyArrow.visible=false;dragArrow.visible=false;}}else{[gravArrow,velArrow,dragArrow,vxArrow,vyArrow].forEach(a=>{a.visible=false;});}if(tickCount%4===0){setHud({x:pt.x.toFixed(2),y:Math.max(0,pt.y).toFixed(2),vx:pt.vx.toFixed(2),vy:pt.vy.toFixed(2),v:pt.v.toFixed(2),t:pt.t.toFixed(2)});}renderer.render(scene,camera);};animate();
      const onResize=():void=>{const nW=el.clientWidth||el.offsetWidth||800;const nH=el.clientHeight||el.offsetHeight||460;if(nW<10||nH<10)return;renderer.setSize(nW,nH);camera.aspect=nW/nH;camera.updateProjectionMatrix();};window.addEventListener("resize",onResize);
      cleanupFn=():void=>{cancelAnimationFrame(aid);window.removeEventListener("resize",onResize);window.removeEventListener("mouseup",onMU);window.removeEventListener("mousemove",onMM);renderer.domElement.removeEventListener("mousedown",onMD);renderer.domElement.removeEventListener("wheel",onWh);if(trailMesh)trailMesh.geometry.dispose();renderer.dispose();if(el.contains(renderer.domElement))el.removeChild(renderer.domElement);};
    });
    return():void=>{cancelAnimationFrame(rafBoot);cleanupFn?.();};
  },[points]);
  const isAr=lang==="ar";
  return(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",position:"relative"}}><div style={{padding:"5px 14px",display:"flex",alignItems:"center",gap:10,background:"rgba(26,35,126,.07)",borderBottom:"1px solid rgba(26,35,126,.1)",flexShrink:0}}><span style={{fontFamily:"Orbitron",fontSize:10,fontWeight:700,color:"#1a237e",letterSpacing:2}}>3D VIEW</span><span style={{fontFamily:"IBM Plex Mono",fontSize:9,color:"#556"}}>{isAr?"اسحب=تدوير · Scroll=تكبير":"drag=orbit · scroll=zoom"}</span></div><div ref={mountRef} style={{flex:1,cursor:"grab",minHeight:0}}/>{hud&&(<div style={{position:"absolute",top:34,left:10,background:"rgba(0,0,0,.72)",backdropFilter:"blur(8px)",borderRadius:10,padding:"8px 12px",fontFamily:"IBM Plex Mono",fontSize:11,color:"#eee",lineHeight:2,pointerEvents:"none",border:"1px solid rgba(255,255,255,.12)"}}><div style={{color:"#7ec8e3"}}>t = <b>{hud.t}</b> ث</div><div style={{color:"#ff9999"}}>x = <b>{hud.x}</b> م</div><div style={{color:"#99ff99"}}>y = <b>{hud.y}</b> م</div><div style={{color:"#ffcc55"}}>V = <b>{hud.v}</b> م/ث</div><div style={{color:"#aad4ff"}}>Vx= <b>{hud.vx}</b></div><div style={{color:"#cc99ff"}}>Vy= <b>{hud.vy}</b></div></div>)}</div>);
}

// ─── UI helpers ───────────────────────────────────────────────────────────
interface APASLogoProps{size?:number;dark?:boolean}
function APASLogo({size=44,dark=false}:APASLogoProps){const a=dark?"#eeeeee":"#111";return(<svg width={size} height={size} viewBox="0 0 80 80" fill="none"><defs><linearGradient id={"lg1"+dark} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={dark?"#ffffff":"#111"}/><stop offset="100%" stopColor={dark?"#aaaaaa":"#555"}/></linearGradient><linearGradient id={"lg2"+dark} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={dark?"#111111":"#fff"} stopOpacity=".95"/><stop offset="100%" stopColor={dark?"#0a0a0a":"#f5f5f5"} stopOpacity=".98"/></linearGradient><filter id="gf2d"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="40" cy="40" r="36" stroke={"url(#lg1"+dark+")"} strokeWidth="1.2" strokeDasharray="6 3" opacity=".7" style={{animation:"spin 10s linear infinite",transformOrigin:"40px 40px"}}/><polygon points="40,13 58,23.5 58,44.5 40,55 22,44.5 22,23.5" fill={"url(#lg2"+dark+")"} stroke={"url(#lg1"+dark+")"} strokeWidth="1.2"/><path d="M24 50 Q36 18 58 40" stroke={a} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".6"/><circle cx="58" cy="40" r="4" fill={a} filter="url(#gf2d)"/><text x="40" y="43" textAnchor="middle" fontFamily="Orbitron" fontWeight="900" fontSize="13" fill={dark?"#eeeeee":"#111"} opacity=".95">A</text></svg>);}

interface SlideType{icon:string;titleAr:string;descAr:string;tag:string}
const SLIDES:SlideType[]=[{icon:"🎯",titleAr:"مرحباً في APAS",descAr:"نظام متكامل لمحاكاة وتحليل حركة المقذوفات بالذكاء الاصطناعي.",tag:"INTRO"},{icon:"⚙️",titleAr:"المعاملات الفيزيائية",descAr:"تحكّم في السرعة والزاوية والجاذبية والكتلة ومقاومة الهواء.",tag:"PARAMS"},{icon:"🖥️",titleAr:"لوحة المحاكاة",descAr:"شاهد المسار مع ارتداد الكرة. Space=إيقاف · R=إعادة.",tag:"SIMULATION"},{icon:"🤖",titleAr:"توقعات الذكاء الاصطناعي",descAr:"تحسب المدى وارتفاع الذروة وزمن الطيران بمعادلات مغلقة.",tag:"AI"},{icon:"🌐",titleAr:"عرض ثلاثي الأبعاد",descAr:"اضغط 3D لمشاهدة المسار في فضاء تفاعلي مع HUD للقيم اللحظية.",tag:"3D"}];

interface OnboardingProps{onFinish:()=>void;sounds:SoundFunctions}
function OnboardingScreen({onFinish,sounds}:OnboardingProps){const [slide,setSlide]=useState(0);const [dir,setDir]=useState<"r"|"l">("r");const s=SLIDES[slide];const go=(n:number):void=>{setDir(n>slide?"r":"l");setSlide(n);sounds.next();};return(<div style={{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#f8faff,#eef4fd,#f3f0ff)"}}><div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(37,99,235,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.04) 1px,transparent 1px)",backgroundSize:"48px 48px"}}/><div style={{position:"relative",width:520,maxWidth:"93vw",animation:"popIn .4s cubic-bezier(.34,1.56,.64,1)"}}><div style={{background:"rgba(255,255,255,.95)",backdropFilter:"blur(32px)",border:"1px solid rgba(0,0,0,.12)",borderRadius:24,padding:"36px 44px 30px",boxShadow:"0 20px 60px rgba(0,0,0,.1)"}}><div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:28}}>{SLIDES.map((_,i)=><div key={i} onClick={()=>go(i)} style={{width:i===slide?32:9,height:9,borderRadius:5,background:i===slide?"linear-gradient(90deg,#111,#444)":i<slide?"rgba(0,0,0,.3)":"rgba(0,0,0,.1)",transition:"all .35s cubic-bezier(.34,1.56,.64,1)",cursor:"pointer"}}/>)}</div><div style={{textAlign:"center",marginBottom:12}}><span style={{fontFamily:"IBM Plex Mono",fontSize:9.5,fontWeight:600,color:"rgba(0,0,0,.4)",letterSpacing:3,background:"rgba(0,0,0,.05)",padding:"3px 12px",borderRadius:20,border:"1px solid rgba(0,0,0,.1)"}}>{s.tag}</span></div><div key={"i"+slide} style={{textAlign:"center",marginBottom:14,animation:dir==="r"?"slideL .35s ease":"slideR .35s ease"}}><div style={{fontSize:52,lineHeight:1,animation:"bounce 3s ease-in-out infinite"}}>{s.icon}</div></div><div key={"t"+slide} style={{textAlign:"center",marginBottom:30,animation:dir==="r"?"slideL .4s ease .05s both":"slideR .4s ease .05s both"}}><h2 style={{fontFamily:"IBM Plex Sans",fontWeight:800,fontSize:21,color:"#111",marginBottom:10}}>{s.titleAr}</h2><div style={{width:40,height:2.5,background:"linear-gradient(90deg,#111,#555)",borderRadius:2,margin:"0 auto 12px"}}/><p style={{fontFamily:"IBM Plex Sans",fontSize:13.5,color:"rgba(0,0,0,.55)",lineHeight:1.8,direction:"rtl"}}>{s.descAr}</p></div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><button className="apas-btn" onClick={()=>slide>0&&go(slide-1)} style={{padding:"9px 18px",borderRadius:10,background:slide>0?"rgba(0,0,0,.06)":"transparent",border:"1px solid "+(slide>0?"rgba(0,0,0,.15)":"transparent"),color:slide>0?"#111":"transparent",fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:500,cursor:slide>0?"pointer":"default",display:"flex",alignItems:"center",gap:6}}><ChevronLeft size={14}/>السابق</button><span style={{fontFamily:"IBM Plex Mono",fontSize:10,color:"rgba(0,0,0,.3)",letterSpacing:1}}>{slide+1}/{SLIDES.length}</span>{slide<SLIDES.length-1?<button className="apas-btn" onClick={()=>go(slide+1)} style={{padding:"9px 22px",borderRadius:10,background:"#111",border:"none",color:"#fff",fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>التالي<ChevronRight size={14}/></button>:<button className="apas-btn" onClick={onFinish} style={{padding:"9px 22px",borderRadius:10,background:"#111",border:"none",color:"#fff",fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:700,cursor:"pointer"}}>ابدأ ◈</button>}</div></div><button onClick={onFinish} style={{position:"absolute",top:-26,right:0,fontFamily:"IBM Plex Sans",fontSize:12,color:"rgba(0,0,0,.3)",background:"transparent",border:"none",cursor:"pointer"}}>تخطي</button></div></div>);}

interface IntroProps{onEnter:()=>void}
function IntroScreen({onEnter}:IntroProps){const [bar,setBar]=useState(0);const [phase,setPhase]=useState(0);const [status,setStatus]=useState("Initializing...");const sounds=useSounds();useEffect(()=>{const msgs=["Loading physics engine...","Calibrating bounce dynamics...","Mounting 3D renderer...","▸ APAS READY"];let b=0,mi=0;const iv=setInterval(()=>{b+=1.8;setBar(Math.min(b,100));if(b%22<1.8&&mi<msgs.length-1){mi++;setStatus(msgs[mi]);}if(b>=100){clearInterval(iv);setTimeout(()=>setPhase(1),400);}},30);return()=>clearInterval(iv);},[]);return(<div style={{position:"fixed",inset:0,background:"linear-gradient(160deg,#f8faff,#eef4fd,#f3f0ff)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}><div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(37,99,235,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.04) 1px,transparent 1px)",backgroundSize:"48px 48px"}}/>{[0,1,2].map(i=><div key={i} style={{position:"absolute",width:420+i*80,height:420+i*80,borderRadius:"50%",border:"1px solid rgba(0,0,0,"+(.06-i*.018)+")",animation:"ringX "+(4+i*.6)+"s ease-out infinite",animationDelay:i*1.1+"s"}}/>)}<div style={{animation:"scaleIn .9s cubic-bezier(.34,1.56,.64,1) forwards",marginBottom:28}}><APASLogo size={110}/></div><div style={{animation:"textReveal 1s ease forwards .4s",opacity:0,textAlign:"center",marginBottom:6}}><div style={{fontFamily:"Orbitron",fontWeight:900,fontSize:52,letterSpacing:6,color:"#111"}}>APAS</div></div><div style={{animation:"fadeUp .8s ease forwards .6s",opacity:0,textAlign:"center",marginBottom:28}}><div style={{fontFamily:"IBM Plex Mono",fontSize:12,color:"rgba(0,0,0,.45)",letterSpacing:3.5}}>AI Projectile Analysis System</div><div style={{fontFamily:"IBM Plex Sans",fontSize:14,color:"rgba(0,0,0,.4)",marginTop:7,letterSpacing:2}}>نظام تحليل المقذوفات بالذكاء الاصطناعي</div></div><div style={{width:340,animation:"fadeUp .8s ease forwards 1s",opacity:0}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:"rgba(0,0,0,.4)"}}>{status}</span><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:"#111",fontWeight:700}}>{Math.round(bar)}%</span></div><div style={{height:3,background:"rgba(0,0,0,.1)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:bar+"%",background:"linear-gradient(90deg,#111,#555)",transition:"width .04s linear",borderRadius:2}}/></div></div>{phase===1&&<button className="apas-btn" onClick={()=>{sounds.enter();setTimeout(onEnter,200);}} style={{marginTop:42,fontFamily:"Orbitron",fontWeight:700,fontSize:12,letterSpacing:3.5,color:"#fff",background:"#111",border:"none",padding:"14px 52px",borderRadius:8,cursor:"pointer",animation:"fadeUp .5s ease forwards",boxShadow:"0 8px 30px rgba(0,0,0,.25)"}}>◈ ENTER SYSTEM ◈</button>}<div style={{position:"absolute",bottom:22,fontFamily:"IBM Plex Mono",fontSize:9.5,color:"rgba(0,0,0,.2)",letterSpacing:2}}>PHYSICS · AI · 3D · BOUNCE · v7.2</div></div>);}

interface ColPanelProps{gl:CSSProperties;icon:ReactNode;title:string;acc:string;mut:string;children:ReactNode;defaultOpen?:boolean}
function ColPanel({gl,icon,title,acc,mut,children,defaultOpen=true}:ColPanelProps){const [open,setOpen]=useState(defaultOpen);return(<div style={gl}><div style={{display:"flex",alignItems:"center",gap:8,padding:"13px 16px",cursor:"pointer",userSelect:"none"}} onClick={()=>setOpen(o=>!o)}><span style={{color:acc,display:"flex",flexShrink:0}}>{icon}</span><span style={{fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:700,color:acc,flex:1,letterSpacing:.3}}>{title}</span><span style={{color:mut,transition:"transform .2s",transform:open?"rotate(0)":"rotate(-90deg)",display:"flex"}}><ChevronDown size={14}/></span></div>{open&&<div style={{padding:"0 16px 16px",animation:"open .2s ease"}}>{children}</div>}</div>);}

interface ParamRowProps{label:string;unit:string;value:number;min:number;max:number;step:number;acc:string;col:string;mut:string;bord:string;ibg:string;onChange:(v:number)=>void;dark:boolean}
function ParamRow({label,unit,value,min,max,step,acc,col,mut,bord,ibg,onChange,dark}:ParamRowProps){const [loc,setLoc]=useState(String(value));useEffect(()=>setLoc(String(value)),[value]);const commit=(v:string):void=>{const n=parseFloat(v);if(!isNaN(n))onChange(Math.min(max,Math.max(min,n)));};const pct=((value-min)/(max-min))*100;return(<div style={{marginBottom:2}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"baseline"}}><span style={{fontFamily:"IBM Plex Sans",fontSize:12.5,fontWeight:500}}>{label}</span><span style={{fontFamily:"IBM Plex Mono",fontSize:10.5,color:mut,background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)",padding:"1px 6px",borderRadius:4}}>{unit}</span></div><div dir="ltr"><input type="range" min={min} max={max} step={step} value={value} onChange={e=>{onChange(+e.target.value);setLoc(e.target.value);}} style={{width:"100%",marginBottom:5,background:"linear-gradient(to right,"+acc+" "+pct+"%,"+(dark?"rgba(255,255,255,.12)":"rgba(0,0,0,.1)")+" "+pct+"%)",accentColor:acc}}/></div><input type="number" min={min} max={max} step={step} value={loc} onChange={e=>setLoc(e.target.value)} onBlur={e=>commit(e.target.value)} onKeyDown={e=>e.key==="Enter"&&commit((e.target as HTMLInputElement).value)} style={{width:"100%",background:ibg,border:"1px solid "+bord,borderRadius:6,color:acc,fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:600,padding:"5px 8px",outline:"none",textAlign:"center"}}/></div>);}

interface InlineChatProps{params:SimParams;lang:string;dark:boolean;col:string;bord:string;ibg:string;mut:string;acc:string}
function InlineChat({params,lang,dark,col,bord,ibg,mut,acc}:InlineChatProps){const [msgs,setMsgs]=useState<ChatMessage[]>([{role:"ai",text:lang==="ar"?"مرحباً! أنا APAS Physics AI 🎯":"Hi! I'm APAS Physics AI 🎯"}]);const [input,setInput]=useState("");const [busy,setBusy]=useState(false);const sounds=useSounds();const endRef=useRef<HTMLDivElement>(null);useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);const send=async():Promise<void>=>{if(!input.trim()||busy)return;sounds.click();const m=input.trim();setInput("");const nm:ChatMessage[]=[...msgs,{role:"user",text:m}];setMsgs(nm);setBusy(true);try{const r=await chatAI(nm,params,lang);setMsgs(p=>[...p,{role:"ai",text:r}]);sounds.success();}catch{setMsgs(p=>[...p,{role:"ai",text:"⚠ خطأ في الاتصال"}]);}setBusy(false);};const userBg=dark?"#eeeeee":"#111",userCol=dark?"#000":"#fff";const aiBg=dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.04)";return(<div style={{background:dark?"#0a0a0a":"#fff",border:"1px solid "+bord,borderRadius:12,display:"flex",flexDirection:"column",height:290,overflow:"hidden",flexShrink:0}}><div style={{padding:"11px 14px",borderBottom:"1px solid "+bord,display:"flex",alignItems:"center",gap:8,flexShrink:0,background:dark?"#000":"#f9f9f9"}}><APASLogo size={22} dark={dark}/><div style={{flex:1}}><div style={{fontFamily:"Orbitron",fontWeight:700,fontSize:11,color:acc,letterSpacing:1.5}}>APAS AI</div><div style={{fontFamily:"IBM Plex Mono",fontSize:9.5,color:mut,display:"flex",alignItems:"center",gap:4}}><div style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",animation:"pulse 1.5s infinite"}}/>{lang==="ar"?"مباشر":"LIVE"}</div></div><MessageSquare size={14} color={acc}/></div><div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:8}}>{msgs.map((m,i)=>(<div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"88%",animation:"fadeIn .3s ease"}}>{m.role==="ai"&&<div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}><APASLogo size={13} dark={dark}/><span style={{fontFamily:"IBM Plex Mono",fontSize:8.5,color:mut,letterSpacing:1}}>APAS AI</span></div>}<div style={{padding:"8px 11px",lineHeight:1.65,fontSize:12.5,borderRadius:m.role==="user"?"10px 10px 3px 10px":"3px 10px 10px 10px",background:m.role==="user"?userBg:aiBg,color:m.role==="user"?userCol:col,border:m.role==="ai"?"1px solid "+bord:"none"}}>{m.text}</div></div>))}{busy&&<div style={{alignSelf:"flex-start",display:"flex",gap:4,padding:"9px 12px",background:aiBg,borderRadius:"3px 10px 10px 10px",border:"1px solid "+bord}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:dark?"#ccc":"#333",animation:"bounce 1s ease-in-out infinite",animationDelay:i*.15+"s"}}/>)}</div>}<div ref={endRef}/></div><div dir="ltr" style={{padding:"8px 10px",borderTop:"1px solid "+bord,display:"flex",gap:6,flexShrink:0,background:dark?"#000":"#f9f9f9"}}><input style={{flex:1,background:ibg,border:"1px solid "+bord,borderRadius:8,color:col,fontFamily:"IBM Plex Mono",fontSize:12,padding:"7px 10px",outline:"none",direction:lang==="ar"?"rtl":"ltr"}} value={input} placeholder={lang==="ar"?"اسأل عن الفيزياء...":"Ask about physics..."} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}/><button className="apas-btn" style={{padding:"7px 10px",borderRadius:8,background:dark?"#eeeeee":"#111",border:"none",cursor:"pointer",display:"flex",alignItems:"center",color:dark?"#000":"#fff"}} onClick={send} disabled={busy}><Send size={13}/></button></div></div>);}

interface PredCardProps{icon:string;label:string;value:string;unit:string;color:string;borderColor:string;delay:number;dark:boolean}
function PredCard({icon,label,value,unit,color,borderColor,delay,dark}:PredCardProps){const [disp,setDisp]=useState(0);useEffect(()=>{const target=parseFloat(value)||0;let start:number|null=null;const step=(ts:number):void=>{if(!start)start=ts;const p=Math.min((ts-start)/900,1),ease=1-Math.pow(1-p,3);setDisp(target*ease);if(p<1)requestAnimationFrame(step);};const t=setTimeout(()=>requestAnimationFrame(step),delay);return()=>clearTimeout(t);},[value,delay]);return(<div style={{padding:"14px 10px",borderRadius:12,textAlign:"center",border:"1.5px solid "+borderColor,background:dark?"#111":"#fff",animation:"predCard .5s ease "+(delay/1000)+"s both",flex:1,boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,.06)"}}><div style={{fontSize:20,marginBottom:6}}>{icon}</div><div style={{fontFamily:"IBM Plex Mono",fontWeight:800,fontSize:22,color}}>{disp.toFixed(2)}<span style={{fontSize:11,color:color+"88",marginLeft:2}}>{unit}</span></div><div style={{fontSize:11.5,color:dark?"rgba(200,200,200,.5)":"rgba(0,0,0,.45)",marginTop:5,fontFamily:"IBM Plex Sans"}}>{label}</div></div>);}

interface TermInfoModalProps{term:TermDef|null;onClose:()=>void;dark:boolean;col:string;bord:string;mut:string;ibg:string}
function TermInfoModal({term,onClose,dark,col,bord,mut,ibg}:TermInfoModalProps){if(!term)return null;const surf=dark?"#141414":"#fff",hc=dark?"#eeeeee":"#111";return(<div style={{position:"fixed",inset:0,zIndex:10010,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)"}} onClick={onClose}><div style={{width:400,maxWidth:"92vw",background:surf,border:"1.5px solid "+bord,borderRadius:18,padding:24,boxShadow:"0 28px 70px rgba(0,0,0,.4)",animation:"termPop .3s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><div style={{width:44,height:44,borderRadius:12,background:dark?"#1a1a1a":"#f5f5f5",border:"1.5px solid "+bord,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"IBM Plex Mono",fontWeight:900,fontSize:17,color:hc}}>{term.symbol}</span></div><div style={{flex:1}}><div style={{fontFamily:"IBM Plex Sans",fontWeight:800,fontSize:15,color:hc}}>{term.name}</div><div style={{fontFamily:"IBM Plex Mono",fontSize:10,color:mut,letterSpacing:1}}>{term.unit}</div></div><button onClick={onClose} style={{background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",border:"1px solid "+bord,borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:hc}}><X size={14}/></button></div><p style={{fontFamily:"IBM Plex Sans",fontSize:13,color:col,lineHeight:1.75,marginBottom:14,padding:"10px 12px",background:dark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)",borderRadius:9,borderRight:"3px solid "+bord,direction:"rtl"}}>{term.definition}</p>{term.steps.length>0&&(<div style={{background:ibg,border:"1px solid "+bord,borderRadius:12,padding:14}}><div style={{fontFamily:"IBM Plex Mono",fontSize:9,color:mut,letterSpacing:2,marginBottom:10}}>⊳ خطوات الحساب</div>{term.steps.map((s,i)=>(<div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}><div style={{width:20,height:20,borderRadius:6,background:dark?"#eeeeee":"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:dark?"#000":"#fff",flexShrink:0,marginTop:1}}>{i+1}</div><div style={{fontFamily:"IBM Plex Mono",fontSize:12,color:col,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:s}}/></div>))}</div>)}</div></div>);}

interface CatAccordionProps{cat:Category;col:string;mut:string;bord:string;dark:boolean;onDeepExplain:()=>void}
function CatAccordion({cat,col,mut,bord,dark,onDeepExplain}:CatAccordionProps){
  const [open,setOpen]=useState(false);
  const [btnHov,setBtnHov]=useState(false);
  const sparkleCol=dark?"#ffe082":"#c62828";
  return(
    <div style={{borderRadius:12,border:"1.5px solid "+(open?bord:(dark?"rgba(255,255,255,.08)":"rgba(0,0,0,.12)")),overflow:"hidden",transition:"border-color .2s"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"11px 16px",background:open?(dark?"#1c1c1c":"#f0f0f0"):(dark?"#111111":"#fafafa"),border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background .2s"}}>
        <div style={{width:28,height:28,borderRadius:8,background:open?(dark?"#eeeeee":"#111"):(dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.1)"),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"IBM Plex Mono",fontWeight:900,fontSize:13,color:open?(dark?"#000":"#fff"):(dark?"#ccc":"#333"),flexShrink:0}}>{cat.icon}</div>
        <span style={{fontFamily:"Orbitron",fontSize:10.5,fontWeight:700,color:cat.color,letterSpacing:2,flex:1,textAlign:"right"}}>{cat.label}</span>
        <span style={{display:"flex",color:dark?"#aaa":"#333",opacity:.7,transition:"transform .25s",transform:open?"rotate(0deg)":"rotate(-90deg)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span>
      </button>
      {open&&(
        <div style={{animation:"open .22s ease"}}>
          {cat.rows.map(([sym,formula,sub,val,unit,vc],ri)=>(
            <div key={sym+ri} className="eq-row" style={{padding:"10px 16px",borderTop:"1px solid "+(dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)"),background:"transparent"}}>
              <div dir="ltr" style={{fontFamily:"IBM Plex Mono",fontSize:13,marginBottom:3}}><span style={{fontWeight:800,color:vc}}>{sym}</span><span style={{color:mut,margin:"0 6px"}}>=</span><span style={{color:col,opacity:.9}}>{formula}</span></div>
              <div dir="ltr" style={{fontFamily:"IBM Plex Mono",fontSize:11,color:mut,marginBottom:2,paddingRight:8}}><span style={{marginRight:4,opacity:.5}}>→</span>{sub}<span style={{marginLeft:8,fontWeight:700,color:vc}}>= {val}</span><span style={{fontSize:10,marginLeft:4,opacity:.6}}>{unit}</span></div>
            </div>
          ))}
          <div style={{padding:"10px 16px 14px",borderTop:"1px solid "+(dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)")}}>
            <button className="apas-btn" onMouseEnter={()=>setBtnHov(true)} onMouseLeave={()=>setBtnHov(false)} onClick={e=>{e.stopPropagation();onDeepExplain();}} style={{width:"100%",padding:"9px 14px",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,border:`1.5px solid ${sparkleCol}55`,background:btnHov?(dark?"rgba(255,224,130,.1)":"rgba(198,40,40,.06)"):"transparent",transition:"background .2s",fontFamily:"IBM Plex Sans",fontSize:12.5,fontWeight:700,color:sparkleCol}}>
              <Sparkles size={13}/>كيف تم الحساب؟ — شرح تعليمي عميق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EqModalProps{open:boolean;onClose:()=>void;params:SimParams;preds:Predictions|null;dark:boolean;col:string;bord:string;acc:string;mut:string;ibg:string;onDetailedClick:()=>void;onDeepExplain:(catLabel:string)=>void}
function EqModal({open,onClose,params,preds,dark,col,bord,acc,mut,ibg,onDetailedClick,onDeepExplain}:EqModalProps){
  if(!open)return null;
  const ev=eqVals(params,preds),f=(n:number)=>n.toFixed(4);
  const surf=dark?"#141414":"#fff",h1=dark?"#eeeeee":"#111",headBg=dark?"#0d0d0d":"#f5f5f5";
  const cats:Category[]=[{label:"مكوّنات السرعة",color:dark?"#eeeeee":"#111",icon:"⇀",rows:[["Vx₀","V₀·cos(θ)",params.v0+"·cos("+params.angle+"°)",f(ev.vx0),"م/ث",dark?"#eeeeee":"#111"],["Vy₀","V₀·sin(θ)",params.v0+"·sin("+params.angle+"°)",f(ev.vy0),"م/ث",dark?"#dddddd":"#333"]]},{label:"القوى",color:dark?"#cccccc":"#333",icon:"F",rows:[["Fg","m·g",params.mass+"×"+params.g,f(ev.fg),"N",dark?"#cccccc":"#333"],["Fd","k·V²",params.kDrag+"×V²",ev.hasAir?f(ev.fd0):"0","N",dark?"#bbbbbb":"#444"]]},{label:"النتائج",color:dark?"#eeeeee":"#111",icon:"◎",rows:[["R","Vx₀·tF","...",f(ev.range),"م",dark?"#eeeeee":"#111"],["Hmax","h₀+Vy₀²/2g","...",f(ev.maxH),"م",dark?"#dddddd":"#333"],["tF","quadratic","...",f(ev.tF),"ث",dark?"#eeeeee":"#111"]]}];
  return(<div style={{position:"fixed",inset:0,zIndex:10001,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)"}} onClick={onClose}><div style={{width:"min(680px,95vw)",background:surf,border:"1.5px solid "+bord,borderRadius:20,boxShadow:"0 32px 80px rgba(0,0,0,.5)",animation:"modalSlide .35s cubic-bezier(.34,1.56,.64,1)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}><div style={{padding:"16px 22px",background:headBg,borderBottom:"1px solid "+bord,display:"flex",alignItems:"center",gap:10}}><FlaskConical size={18} color={h1}/><div style={{flex:1}}><div style={{fontFamily:"Orbitron",fontWeight:800,fontSize:14,color:h1,letterSpacing:2}}>الحسابات والمعادلات</div><div style={{fontFamily:"IBM Plex Mono",fontSize:9.5,color:mut,letterSpacing:1.5}}>APAS PHYSICS · اضغط ✦ لشرح عميق</div></div><button onClick={onClose} className="apas-btn" style={{background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",border:"1px solid "+bord,borderRadius:8,padding:"6px 10px",cursor:"pointer",color:h1,display:"flex",alignItems:"center"}}><X size={14}/></button></div><div style={{padding:"14px 22px 10px",display:"flex",flexDirection:"column",gap:8,animation:"open .25s ease"}}>{cats.map(cat=><CatAccordion key={cat.label} cat={cat} col={col} mut={mut} bord={bord} dark={dark} onDeepExplain={()=>onDeepExplain(cat.label)}/>)}</div><div style={{padding:"14px 22px",borderTop:"1px solid "+bord,display:"flex",justifyContent:"space-between",alignItems:"center",background:headBg}}><div style={{fontFamily:"IBM Plex Mono",fontSize:10,color:mut}}>انقر خارج للإغلاق</div><button className="apas-btn" onClick={onDetailedClick} style={{padding:"10px 22px",borderRadius:10,background:dark?"#eeeeee":"#111",border:"none",color:dark?"#000":"#fff",fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}><BookOpen size={14}/>تفاصيل</button></div></div></div>);
}

interface DetailedCalcModalProps{open:boolean;onClose:()=>void;params:SimParams;preds:Predictions|null;dark:boolean;col:string;bord:string;acc:string;mut:string;ibg:string;onTermClick:(sym:string)=>void;onDeepExplain:(label:string)=>void}
function DetailedCalcModal({open,onClose,params,preds,dark,col,bord,acc,mut,ibg,onTermClick,onDeepExplain}:DetailedCalcModalProps){
  if(!open)return null;
  const ev=eqVals(params,preds),f=(n:number)=>n.toFixed(4);
  const surf=dark?"#141414":"#fff",h1=dark?"#eeeeee":"#111",headBg=dark?"#0d0d0d":"#f5f5f5";
  const blockBg=dark?"#1a1a1a":"rgba(0,0,0,.03)",blockBord=dark?"rgba(255,255,255,.18)":"rgba(0,0,0,.12)";
  const TK=({sym}:{sym:string})=><span className="term-token" style={{color:h1,borderBottomColor:dark?"rgba(255,255,255,.3)":"rgba(0,0,0,.35)",background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)",borderRadius:3,padding:"0 3px"}} onClick={()=>onTermClick(sym)}>{sym}</span>;
  const sparkleCol=dark?"#ffe082":"#c62828";
  const steps:StepItem[]=[
    {num:"01",icon:"⚡",title:"قانون نيوتن الثاني",badge:"F=ma",content:<div><p style={{marginBottom:12,lineHeight:1.85}}>القوة الكلية = الكتلة × التسارع.</p><div style={{fontFamily:"IBM Plex Mono",fontSize:13,background:blockBg,border:"1px solid "+blockBord,borderRadius:10,padding:"14px 18px",textAlign:"center"}}><div style={{fontSize:16}}>Σ<b style={{color:h1}}>F</b> = <TK sym="m"/> · <b>a</b></div></div></div>},
    {num:"02",icon:"⬇️",title:"تحليل القوى",badge:"Forces",content:<div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div style={{padding:"12px 14px",borderRadius:10,border:"1px solid "+blockBord,background:blockBg}}><div style={{fontFamily:"Orbitron",fontSize:10,color:h1,marginBottom:8}}>GRAVITY</div><div style={{fontFamily:"IBM Plex Mono",fontSize:13}}><TK sym="Fg"/> = <TK sym="m"/>·<TK sym="g"/> = {f(ev.fg)} N</div></div><div style={{padding:"12px 14px",borderRadius:10,border:"1px solid "+blockBord,background:blockBg}}><div style={{fontFamily:"Orbitron",fontSize:10,color:h1,marginBottom:8}}>DRAG</div><div style={{fontFamily:"IBM Plex Mono",fontSize:13}}><TK sym="Fd"/> = k·V² = {f(ev.fd0)} N</div></div></div></div>},
    {num:"03",icon:"↗️",title:"الارتداد e=0.45",badge:"Bounce",content:<div><div style={{fontFamily:"IBM Plex Mono",fontSize:12.5,background:blockBg,border:"1px solid "+blockBord,borderRadius:10,padding:"14px 18px",lineHeight:2.1}}><div>Vy_بعد = −Vy_قبل × <b style={{color:h1}}>0.45</b></div><div>Vx_بعد = Vx_قبل × <b style={{color:h1}}>0.75</b></div></div></div>},
    {num:"04",icon:"∫",title:"تكامل أويلر Δt=0.02",badge:"Euler",content:<div><div style={{fontFamily:"IBM Plex Mono",fontSize:12.5,background:blockBg,border:"1px solid "+blockBord,borderRadius:10,padding:"14px 18px",lineHeight:2.1}}><div>Vx(t+Δt) = Vx(t) + ax·Δt</div><div>x(t+Δt) = x(t) + Vx·Δt</div></div></div>},
    {num:"05",icon:"📐",title:"النتائج التحليلية",badge:"Closed-form",content:<div><div style={{fontFamily:"IBM Plex Mono",fontSize:12.5,background:blockBg,border:"1px solid "+blockBord,borderRadius:10,padding:"14px 18px",lineHeight:2}}><div>R = <b style={{color:h1}}>{f(ev.range)}</b> م</div><div>Hmax = <b style={{color:h1}}>{f(ev.maxH)}</b> م</div><div>tF = <b style={{color:h1}}>{f(ev.tF)}</b> ث</div></div></div>},
  ];
  const stepToLabel=(num:string):string=>({
    "01":"مكوّنات السرعة","02":"القوى","03":"الارتداد","04":"تكامل أويلر","05":"النتائج"
  }[num]||"الحسابات");
  return(<div style={{position:"fixed",inset:0,zIndex:10002,display:"flex",alignItems:"flex-start",justifyContent:"center",background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",overflowY:"auto",padding:"20px 12px"}} onClick={onClose}><div style={{width:"min(820px,96vw)",background:surf,border:"1.5px solid "+bord,borderRadius:20,boxShadow:"0 40px 100px rgba(0,0,0,.5)",animation:"modalSlide .4s cubic-bezier(.34,1.56,.64,1)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}><div style={{padding:"18px 24px",background:headBg,borderBottom:"1px solid "+bord,display:"flex",alignItems:"center",gap:12}}><APASLogo size={32} dark={dark}/><div style={{flex:1}}><div style={{fontFamily:"Orbitron",fontWeight:800,fontSize:15,color:h1,letterSpacing:2}}>الحسابات التفصيلية</div><div style={{fontFamily:"IBM Plex Mono",fontSize:10,color:mut,letterSpacing:2}}>انقر رمزاً للتفاصيل · ✦ للشرح العميق</div></div><button onClick={onClose} style={{background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",border:"1px solid "+bord,borderRadius:9,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:h1,fontFamily:"IBM Plex Mono",fontSize:12}}><X size={13}/>إغلاق</button></div>
  <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>{steps.map(step=>(<div key={step.num} style={{borderRadius:14,border:"1px solid "+bord,overflow:"hidden",background:dark?"rgba(255,255,255,.02)":"#fff"}}><div style={{padding:"12px 18px",background:headBg,borderBottom:"1px solid "+bord,display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:10,background:dark?"#eeeeee":"#111",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Orbitron",fontWeight:900,fontSize:11,color:dark?"#000":"#fff",flexShrink:0}}>{step.num}</div><span style={{fontSize:18}}>{step.icon}</span><span style={{fontFamily:"IBM Plex Sans",fontWeight:800,fontSize:14,color:h1,flex:1,direction:"rtl"}}>{step.title}</span><span style={{fontFamily:"IBM Plex Mono",fontSize:9,color:mut,letterSpacing:1.5,background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",padding:"3px 10px",borderRadius:5,border:"1px solid "+bord}}>{step.badge}</span>
    <button onClick={e=>{e.stopPropagation();onDeepExplain(stepToLabel(step.num));}} style={{background:dark?"rgba(255,224,130,.1)":"rgba(198,40,40,.06)",border:`1px solid ${sparkleCol}55`,borderRadius:6,padding:"4px 7px",cursor:"pointer",display:"flex",alignItems:"center",gap:3,color:sparkleCol,fontFamily:"IBM Plex Sans",fontSize:10.5,fontWeight:700,flexShrink:0}}><Sparkles size={11}/>شرح</button>
  </div><div style={{padding:"16px 18px",fontSize:13,color:col,fontFamily:"IBM Plex Sans",lineHeight:1.8,direction:"rtl"}}>{step.content}</div></div>))}</div></div></div>);
}

// ══════════════════════════════════════════════════════════════════════════
//  Main — APAS v7.2 (Vercel Edition)
// ══════════════════════════════════════════════════════════════════════════
export default function APAS(){
  const [intro,setIntro]=useState(true);
  const [onboarding,setOnboarding]=useState(false);
  const [vis,setVis]=useState(false);
  const [dark,setDark]=useState(false);
  const [lang,setLang]=useState<"ar"|"en">("ar");
  const isAr=lang==="ar";

  const [params,setParams]=useState<SimParams>({v0:50,angle:45,g:9.81,mass:1,h0:0,kDrag:0});
  const [disp,setDisp]=useState<DisplayOptions>({crit:true,fvec:false,comp:false});

  const [playing,setPlaying]=useState(false);
  const [isPaused,setIsPaused]=useState(false);
  const [progress,setProgress]=useState(0);
  const [curT,setCurT]=useState(0);
  const [speed,setSpeed]=useState(1);

  const [playing3D,setPlaying3D]=useState(false);
  const [isPaused3D,setIsPaused3D]=useState(false);
  const [progress3D,setProgress3D]=useState(0);
  const [curT3D,setCurT3D]=useState(0);
  const [speed3D,setSpeed3D]=useState(1);

  const [fs3DOpen,setFs3DOpen]=useState(false);
  const [fsOpen,setFsOpen]=useState(false);

  const [preds,setPreds]=useState<Predictions|null>(null);
  const [predKey,setPredKey]=useState(0);
  const [xVar,setXVar]=useState("t");
  const [yVar,setYVar]=useState("Y");
  const [show3D,setShow3D]=useState(false);
  const [points3D,setPoints3D]=useState<TrajectoryPoint[]>([]);
  const [imgSrc,setImgSrc]=useState<string|null>(null);
  const [imgB64,setImgB64]=useState<string|null>(null);
  const [imgMime,setImgMime]=useState("image/jpeg");
  const [scanning,setScanning]=useState(false);
  const [scanProg,setScanProg]=useState(0);
  const [scanPhase,setScanPhase]=useState("");
  const [scanRes,setScanRes]=useState<ScanResult|null>(null);
  const [theoVals,setTheoVals]=useState<TheoVals>({range:"",maxH:"",tF:""});
  const [isExportOpen,setIsExportOpen]=useState(true);
  const [toastMsg,setToastMsg]=useState("");
  const [showEqModal,setShowEqModal]=useState(false);
  const [showDetailModal,setShowDetailModal]=useState(false);
  const [termInfo,setTermInfo]=useState<TermDef|null>(null);
  const [deepExplain,setDeepExplain]=useState<DeepExplainState>({open:false,loading:false,content:"",title:""});

  const handleDeepExplain=useCallback(async(catLabel:string):Promise<void>=>{
    setDeepExplain({open:true,loading:true,content:"",title:catLabel});
    try{
      const content=await fetchDeepExplanation(catLabel,params,preds,lang);
      setDeepExplain(prev=>({...prev,loading:false,content}));
    }catch{
      setDeepExplain(prev=>({...prev,loading:false,content:"⚠ حدث خطأ في الاتصال."}));
    }
  },[params,preds,lang]);

  const openTerm=useCallback((sym:string):void=>{const defs=getTermDefs(params,preds);if(defs[sym])setTermInfo(defs[sym]);},[params,preds]);

  const canvasRef=useRef<HTMLCanvasElement>(null);
  const animRef=useRef<number>(0);
  const frameRef=useRef<number>(0);
  const trajRef=useRef<TrajectoryPoint[]>([]);
  const savedRef=useRef<TrajectoryPoint[][]>([]);
  const speedRef=useRef<number>(1);
  const pausedFrameRef=useRef<number>(0);
  const boundsRef=useRef<Bounds>({xMax:100,yMax:50});
  const playingRef=useRef(false);
  const isPausedRef=useRef(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const frame3DRef=useRef<number>(0);
  const playing3DRef=useRef<boolean>(false);
  const pausedFrame3DRef=useRef<number>(0);
  const speed3DRef=useRef<number>(1);
  const show3DRef=useRef(show3D);
  useEffect(()=>{show3DRef.current=show3D;},[show3D]);

  const sounds=useSounds();

  const bg=dark?"#0f0f0f":"#f0f0f0";
  const surf=dark?"linear-gradient(145deg,#111111,#0a0a0a)":"#ffffff";
  const bord=dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.18)";
  const col=dark?"#ffffff":"#000000";
  const mut=dark?"#888888":"#666666";
  const acc=dark?"#eeeeee":"#111111";
  const purp=dark?"#cccccc":"#333333";
  const grn=dark?"#dddddd":"#111111";
  const ibg=dark?"rgba(255,255,255,.04)":"rgba(0,0,0,.03)";
  const gl:CSSProperties={background:surf,backdropFilter:"blur(24px)",border:"1.5px solid "+bord,borderRadius:12};
  const T={ar:{ctrl:"المعاملات الفيزيائية",disp:"خيارات العرض",v:"السرعة الابتدائية",ang:"زاوية الإطلاق",grav:"تسارع الجاذبية",mass:"الكتلة",h:"الارتفاع الابتدائي",air:"مقاومة الهواء",dragK:"معامل السحب k",crit:"نقاط حرجة",fvec:"متجهات القوى",comp:"مقارنة المسارات",vision:"رؤية الذكاء الاصطناعي",preds:"توقعات الذكاء الاصطناعي",chart:"التمثيل البياني",err:"تحليل الأخطاء",eqs:"الحسابات والمعادلات",speed:"السرعة",range:"المدى",maxH:"أقصى ارتفاع",tF:"زمن الطيران",conf:"الدقة",scan:"تحليل الصورة",upload:"ارفع صورة مقذوف\nأو اسحب هنا",apply:"تطبيق على المحاكاة",detected:"مكتشف ✓",nodet:"لا يوجد",absErr:"الخطأ المطلق",relErr:"الخطأ النسبي",yourVal:"قيمتك",aiVal:"قيمة AI",openEqs:"فتح لوحة المعادلات",view3d:"عرض ثلاثي الأبعاد",hide3d:"إخفاء ثلاثي الأبعاد"},en:{ctrl:"Physics Parameters",disp:"Display Options",v:"Initial Velocity",ang:"Launch Angle",grav:"Gravity",mass:"Mass",h:"Init Height",air:"Air Resistance",dragK:"Drag k",crit:"Critical Points",fvec:"Force Vectors",comp:"Compare",vision:"AI Vision",preds:"AI Predictions",chart:"Chart",err:"Error Analysis",eqs:"Equations",speed:"Speed",range:"Range",maxH:"Max Height",tF:"Flight Time",conf:"Confidence",scan:"Analyze",upload:"Upload projectile image\nor drag & drop",apply:"Apply to Sim",detected:"Detected ✓",nodet:"Not Found",absErr:"Abs Error",relErr:"Rel Error",yourVal:"Your Value",aiVal:"AI Value",openEqs:"Equations",view3d:"3D View",hide3d:"Hide 3D"}};
  const t=T[lang];
  const VARS=["t","X","Y","V","Vx","Vy","A","E"];
  const varLabel=(v:string):string=>({t:"t(s)",X:"X(m)",Y:"Y(m)",V:"V(m/s)",Vx:"Vx",Vy:"Vy",A:"A(m/s²)",E:"E(J)"}[v]||v);
  const setP=(k:keyof SimParams,v:number):void=>setParams(p=>({...p,[k]:v}));
  const showToast=useCallback((msg:string):void=>{setToastMsg(msg);setTimeout(()=>setToastMsg(""),2600);},[]);
  const Btn=(v:BtnVariant="ghost"):CSSProperties=>({fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:500,padding:"7px 13px",borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",gap:5,border:"none",...(v==="primary"?{background:dark?"#eeeeee":"#111",color:dark?"#000":"#fff"}:v==="success"?{background:dark?"rgba(255,255,255,.06)":"#fff",color:dark?"#eeeeee":"#000",border:"1.5px solid "+(dark?"rgba(255,255,255,.2)":"#000")}:{background:ibg,color:col,border:"1.5px solid "+bord})});

  const draw=useCallback((traj:TrajectoryPoint[],frame:number,showBall:boolean):void=>{
    const cv=canvasRef.current;if(!cv||!traj.length)return;const ctx=cv.getContext("2d");if(!ctx)return;
    const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);const pad={l:58,r:18,t:20,b:44},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;const{xMax:mxX,yMax:mxY}=boundsRef.current,sX=cW/mxX,sY=cH/mxY;
    ctx.fillStyle=dark?"#0a0a0a":"#ffffff";ctx.fillRect(0,0,W,H);
    const tc=(x:number,y:number)=>({cx:pad.l+x*sX,cy:pad.t+cH-Math.max(0,y)*sY});
    ctx.strokeStyle=dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.07)";ctx.lineWidth=1;for(let i=0;i<=10;i++){const xi=pad.l+(cW/10)*i;ctx.beginPath();ctx.moveTo(xi,pad.t);ctx.lineTo(xi,pad.t+cH);ctx.stroke();}for(let i=0;i<=6;i++){const yi=pad.t+(cH/6)*i;ctx.beginPath();ctx.moveTo(pad.l,yi);ctx.lineTo(pad.l+cW,yi);ctx.stroke();}
    ctx.font="10px IBM Plex Mono";ctx.textAlign="center";ctx.fillStyle=dark?"rgba(255,255,255,.45)":"rgba(0,0,0,.5)";for(let i=0;i<=10;i+=2){const v=(mxX/10)*i,{cx}=tc(v,0);ctx.fillText(v.toFixed(v<10?1:0),cx,pad.t+cH+14);}ctx.fillStyle=dark?"rgba(255,255,255,.6)":"rgba(0,0,0,.6)";ctx.fillText("x (m)",pad.l+cW/2,pad.t+cH+28);ctx.fillStyle=dark?"rgba(255,255,255,.45)":"rgba(0,0,0,.5)";ctx.textAlign="right";for(let i=0;i<=6;i++){const v=(mxY/6)*i,{cy}=tc(0,v);ctx.fillText(v.toFixed(v<10?1:0),pad.l-7,cy+4);}ctx.save();ctx.translate(13,pad.t+cH/2);ctx.rotate(-Math.PI/2);ctx.fillStyle=dark?"rgba(255,255,255,.6)":"rgba(0,0,0,.6)";ctx.font="10px IBM Plex Mono";ctx.textAlign="center";ctx.fillText("y (m)",0,0);ctx.restore();
    if(disp.comp)savedRef.current.forEach((st,idx)=>{ctx.beginPath();ctx.strokeStyle=dark?"rgba(200,200,200,"+(.18+idx*.07)+")":"rgba(0,0,0,"+(.12+idx*.06)+")";ctx.lineWidth=1.5;ctx.setLineDash([5,4]);st.forEach((p,i)=>{const{cx,cy}=tc(p.x,p.y);i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy);});ctx.stroke();ctx.setLineDash([]);});
    let wasAbove=traj.length>0&&traj[0].y>0.5;for(let i=1;i<traj.length-1;i++){const isAbove=traj[i].y>0.5;if(wasAbove&&!isAbove){const{cx:bx}=tc(traj[i].x,0);ctx.beginPath();ctx.arc(bx,pad.t+cH,9,0,Math.PI*2);ctx.strokeStyle=dark?"rgba(255,120,60,.6)":"rgba(220,60,20,.5)";ctx.lineWidth=1.5;ctx.stroke();}wasAbove=isAbove;}
    const vF=showBall?Math.min(frame,traj.length-1):traj.length-1;if(vF>1){ctx.beginPath();ctx.lineWidth=2.5;const tg=ctx.createLinearGradient(pad.l,0,pad.l+cW,0);dark?(tg.addColorStop(0,"rgba(255,255,255,.1)"),tg.addColorStop(1,"rgba(255,255,255,.95)")):(tg.addColorStop(0,"rgba(0,0,0,.1)"),tg.addColorStop(1,"rgba(0,0,0,.9)"));ctx.strokeStyle=tg;traj.slice(0,vF+1).forEach((p,i)=>{const{cx,cy}=tc(p.x,p.y);i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy);});ctx.stroke();}
    if(disp.crit&&traj.length>2){let mi=0;for(let i=1;i<traj.length;i++)if(traj[i].y>traj[mi].y)mi=i;const{cx:mx,cy:my}=tc(traj[mi].x,traj[mi].y);ctx.beginPath();ctx.strokeStyle=dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.15)";ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.moveTo(mx,pad.t);ctx.lineTo(mx,pad.t+cH);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(mx,my,7,0,Math.PI*2);ctx.strokeStyle=dark?"rgba(255,255,255,.5)":"rgba(0,0,0,.4)";ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.arc(mx,my,3.5,0,Math.PI*2);ctx.fillStyle=dark?"#ffffff":"#333";ctx.fill();ctx.fillStyle=dark?"#eeeeee":"#333";ctx.font="bold 10px IBM Plex Mono";ctx.textAlign="left";ctx.fillText("▲ "+traj[mi].y.toFixed(2)+"m",mx+10,my-4);}
    if(showBall){const pt=traj[Math.min(frame,traj.length-1)],{cx,cy}=tc(pt.x,Math.max(0,pt.y));for(let i=Math.max(0,frame-18);i<frame;i++){const tp=traj[i];if(!tp)continue;const{cx:tx,cy:ty}=tc(tp.x,Math.max(0,tp.y)),a=(i-(frame-18))/18;ctx.beginPath();ctx.arc(tx,ty,3*a,0,Math.PI*2);ctx.fillStyle=dark?"rgba(255,255,255,"+a*.2+")":"rgba(0,0,0,"+a*.15+")";ctx.fill();}const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,20);grd.addColorStop(0,dark?"rgba(255,255,255,.18)":"rgba(0,0,0,.1)");grd.addColorStop(1,"transparent");ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,cy,20,0,Math.PI*2);ctx.fill();const bg2=ctx.createRadialGradient(cx-2,cy-2,1,cx,cy,9);dark?(bg2.addColorStop(0,"#000"),bg2.addColorStop(.45,"#777"),bg2.addColorStop(1,"#eee")):(bg2.addColorStop(0,"#fff"),bg2.addColorStop(.4,"#888"),bg2.addColorStop(1,"#111"));ctx.beginPath();ctx.arc(cx,cy,9,0,Math.PI*2);ctx.fillStyle=bg2;ctx.fill();ctx.beginPath();ctx.arc(cx,cy,9,0,Math.PI*2);ctx.strokeStyle="rgba(255,255,255,.3)";ctx.lineWidth=1.5;ctx.stroke();
      if(disp.fvec){const v=pt.v;const drawLabel=(lx:number,ly:number,lbl:string,color:string):void=>{ctx.font="bold 11px IBM Plex Mono";ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineWidth=3.5;ctx.lineJoin="round";ctx.strokeStyle=dark?"rgba(0,0,0,.9)":"rgba(255,255,255,.95)";ctx.strokeText(lbl,lx,ly);ctx.fillStyle=color;ctx.fillText(lbl,lx,ly);ctx.textBaseline="alphabetic";};const arrow=(dx:number,dy:number,L:number,color:string,lbl:string):void=>{if(L<3)return;const ex=cx+dx*L,ey=cy+dy*L,ang=Math.atan2(dy,dx);ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);ctx.stroke();const ah=8;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.moveTo(ex,ey);ctx.lineTo(ex-ah*Math.cos(ang-.42),ey-ah*Math.sin(ang-.42));ctx.moveTo(ex,ey);ctx.lineTo(ex-ah*Math.cos(ang+.42),ey-ah*Math.sin(ang+.42));ctx.stroke();drawLabel(ex+Math.cos(ang)*15,ey+Math.sin(ang)*15,lbl,color);};if(v>0.3){const vxN=pt.vx/v,vyN=-pt.vy/v,base=Math.min(v/Math.max(params.v0*.5,1),1.4)*50+12;arrow(vxN,vyN,base,"#d97706","V");const vxLen=Math.abs(pt.vx/v)*base;if(vxLen>4)arrow(pt.vx>=0?1:-1,0,vxLen,"#0891b2","Vx");const vyLen=Math.abs(pt.vy/v)*base;if(vyLen>4)arrow(0,pt.vy>=0?-1:1,vyLen,"#166534","Vy");arrow(0,1,36,"#c2410c","Fg");if(params.kDrag>0){const fdLen=Math.min(params.kDrag*v*v*35,54);if(fdLen>4)arrow(-vxN,-vyN,fdLen,"#be123c","Fd");}}}}
    const last=traj[traj.length-1],{cx:lx}=tc(last.x,0);ctx.strokeStyle=dark?"rgba(255,255,255,.3)":"rgba(0,0,0,.25)";ctx.setLineDash([3,3]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(lx,pad.t);ctx.lineTo(lx,pad.t+cH);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=dark?"#eeeeee":"#333";ctx.font="bold 11px IBM Plex Mono";ctx.textAlign="center";ctx.fillText("✕",lx,pad.t+cH-3);ctx.font="10px IBM Plex Mono";ctx.fillText(last.x.toFixed(2)+"m",lx,pad.t+cH+14);ctx.strokeStyle=dark?"rgba(255,255,255,.22)":"rgba(0,0,0,.3)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+cH);ctx.moveTo(pad.l,pad.t+cH);ctx.lineTo(pad.l+cW,pad.t+cH);ctx.stroke();
  },[params,disp,dark]);

  const recompute=useCallback(():void=>{
    const traj=computeTrajectory(params);trajRef.current=traj;boundsRef.current=computeBounds(traj,params.h0);frameRef.current=0;frame3DRef.current=0;cancelAnimationFrame(animRef.current);setPlaying(false);setIsPaused(false);playingRef.current=false;isPausedRef.current=false;setPlaying3D(false);setIsPaused3D(false);playing3DRef.current=false;setProgress(0);setCurT(0);setProgress3D(0);setCurT3D(0);
    const rad_p=params.angle*Math.PI/180,vx0_p=params.v0*Math.cos(rad_p),vy0_p=params.v0*Math.sin(rad_p);
    let range_p,maxH_p,tF_p;
    if(params.kDrag===0){const disc=vy0_p*vy0_p+2*params.g*params.h0;tF_p=(vy0_p+Math.sqrt(Math.max(0,disc)))/params.g;range_p=vx0_p*tF_p;maxH_p=params.h0+(vy0_p*vy0_p)/(2*params.g);}
    else{const apexPt=traj.reduce((m,pt)=>pt.y>m.y?pt:m,traj[0]);maxH_p=apexPt.y;let fl=traj[traj.length-1];for(let i=2;i<traj.length;i++){if(traj[i-1].y>0.15&&traj[i].y<=0.15){fl=traj[i];break;}}range_p=fl.x;tF_p=fl.t;}
    const eulerErr=params.kDrag>0?Math.min(1.6,params.kDrag*params.v0*0.95):0;const conf=Math.min(99.7,Math.max(98.0,+(99.7-eulerErr).toFixed(1)));
    const p:Predictions={range:range_p,maxH:maxH_p,tF:tF_p,conf};setPreds(p);setPredKey(k=>k+1);setPoints3D([...traj]);
    requestAnimationFrame(()=>draw(traj,0,false));
  },[params,draw]);

  useEffect(()=>{if(vis)recompute();},[params,disp,vis,dark]);
  useEffect(()=>{const cv=canvasRef.current;if(!cv)return;if(fsOpen){cv.width=window.innerWidth;cv.height=window.innerHeight-130;}else{cv.width=720;cv.height=340;}requestAnimationFrame(()=>draw(trajRef.current,frameRef.current,frameRef.current>0));},[fsOpen]);
  useEffect(()=>{playingRef.current=playing&&!isPaused;isPausedRef.current=isPaused;},[playing,isPaused]);

  useEffect(()=>{
    if(!playing||isPaused)return;let active=true,uiTick=0;
    const step=Math.max(1,Math.round(speedRef.current*2)),len=trajRef.current.length;
    const tick=():void=>{if(!active)return;const nf=Math.min(frameRef.current+step,len-1);if(!show3DRef.current){const prev=trajRef.current[Math.max(0,frameRef.current-step)],cur=trajRef.current[nf];if(prev&&cur&&prev.vy>0&&cur.vy<=0&&cur.y>1)sounds.apex();if(prev&&cur&&prev.vy<-0.5&&cur.vy>=0&&cur.y<0.5)sounds.land();}frameRef.current=nf;draw(trajRef.current,nf,true);uiTick++;if(uiTick%6===0){setProgress((nf/Math.max(1,len-1))*100);const pt=trajRef.current[nf];if(pt)setCurT(pt.t);}if(nf<len-1){animRef.current=requestAnimationFrame(tick);}else{setProgress(100);const pt=trajRef.current[len-1];if(pt)setCurT(pt.t);draw(trajRef.current,len-1,true);setPlaying(false);setIsPaused(false);playingRef.current=false;if(!show3DRef.current)sounds.land();}};
    animRef.current=requestAnimationFrame(tick);return()=>{active=false;cancelAnimationFrame(animRef.current);};
  },[playing,isPaused,dark,disp,fsOpen]);

  const handle2DPlay=useCallback(():void=>{if(frameRef.current>=trajRef.current.length-1){frameRef.current=0;setProgress(0);setCurT(0);}setIsPaused(false);setPlaying(true);playingRef.current=true;isPausedRef.current=false;if(!show3DRef.current)sounds.launch();},[]);
  const handle2DPause=useCallback(():void=>{cancelAnimationFrame(animRef.current);pausedFrameRef.current=frameRef.current;setPlaying(false);setIsPaused(true);playingRef.current=false;isPausedRef.current=true;draw(trajRef.current,frameRef.current,true);sounds.click();},[draw]);
  const handle2DResume=useCallback(():void=>{frameRef.current=pausedFrameRef.current;setIsPaused(false);setPlaying(true);playingRef.current=true;isPausedRef.current=false;sounds.click();},[]);
  const handle2DReset=useCallback(():void=>{cancelAnimationFrame(animRef.current);setPlaying(false);setIsPaused(false);playingRef.current=false;isPausedRef.current=false;frameRef.current=0;pausedFrameRef.current=0;setProgress(0);setCurT(0);draw(trajRef.current,0,false);sounds.click();},[draw]);
  const handle2DSeek=(e:React.ChangeEvent<HTMLInputElement>):void=>{cancelAnimationFrame(animRef.current);setPlaying(false);setIsPaused(false);playingRef.current=false;const f=Math.floor((+e.target.value/100)*(trajRef.current.length-1));frameRef.current=f;setProgress(+e.target.value);const pt=trajRef.current[f];if(pt)setCurT(pt.t);draw(trajRef.current,f,true);};
  const handle3DPlay=useCallback(():void=>{if(frame3DRef.current>=points3D.length-1){frame3DRef.current=0;setProgress3D(0);setCurT3D(0);}playing3DRef.current=true;setPlaying3D(true);setIsPaused3D(false);sounds.launch();},[points3D]);
  const handle3DPause=useCallback(():void=>{pausedFrame3DRef.current=frame3DRef.current;playing3DRef.current=false;setPlaying3D(false);setIsPaused3D(true);sounds.click();},[]);
  const handle3DResume=useCallback(():void=>{frame3DRef.current=pausedFrame3DRef.current;playing3DRef.current=true;setPlaying3D(true);setIsPaused3D(false);sounds.click();},[]);
  const handle3DReset=useCallback(():void=>{playing3DRef.current=false;frame3DRef.current=0;setPlaying3D(false);setIsPaused3D(false);setProgress3D(0);setCurT3D(0);sounds.click();},[]);
  const handle3DSeek=(e:React.ChangeEvent<HTMLInputElement>):void=>{playing3DRef.current=false;setPlaying3D(false);setIsPaused3D(false);const f=Math.floor((+e.target.value/100)*(points3D.length-1));frame3DRef.current=f;setProgress3D(+e.target.value);const pt=points3D[f];if(pt)setCurT3D(pt.t);};
  const on3DFrameTick=(fi:number):void=>{const len=points3D.length;setProgress3D((fi/Math.max(1,len-1))*100);const pt=points3D[fi];if(pt)setCurT3D(pt.t);};
  const on3DEnd=():void=>{setPlaying3D(false);setIsPaused3D(false);playing3DRef.current=false;sounds.land();};

  useEffect(()=>{const onKey=(e:KeyboardEvent):void=>{if((e.target as HTMLElement).tagName==="INPUT"||(e.target as HTMLElement).tagName==="TEXTAREA")return;if(e.code==="Space"){e.preventDefault();if(show3D){if(playing3D)handle3DPause();else if(isPaused3D)handle3DResume();else handle3DPlay();}else{if(playing&&!isPaused)handle2DPause();else if(isPaused)handle2DResume();else handle2DPlay();}}if(e.code==="KeyR"){e.preventDefault();if(show3D)handle3DReset();else handle2DReset();}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[show3D,playing,isPaused,playing3D,isPaused3D,handle2DPlay,handle2DPause,handle2DResume,handle2DReset,handle3DPlay,handle3DPause,handle3DResume,handle3DReset]);

  const dlBlob=(blob:Blob,name:string):void=>{const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);};
  const exportPNG=():void=>{const cv=canvasRef.current;if(!cv)return;const a=document.createElement("a");a.href=cv.toDataURL("image/png");a.download="trajectory.png";document.body.appendChild(a);a.click();document.body.removeChild(a);sounds.click();showToast("✓ PNG");};
  const exportJSON=():void=>{const data={params,points:trajRef.current.map(p=>({t:+p.t.toFixed(4),x:+p.x.toFixed(4),y:+p.y.toFixed(4),v:+p.v.toFixed(4)}))};dlBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),"trajectory.json");sounds.success();showToast("✓ JSON");};
  const exportTXT=():void=>{const traj=trajRef.current;let txt="APAS Trajectory\n"+"-".repeat(30)+"\n";if(preds)txt+="R="+preds.range.toFixed(3)+"m H="+preds.maxH.toFixed(3)+"m tF="+preds.tF.toFixed(3)+"s\n\n";txt+="t(s)      x(m)        y(m)        v(m/s)\n";const skip=Math.max(1,Math.floor(traj.length/120));traj.filter((_,i)=>i%skip===0).forEach(p=>{txt+=p.t.toFixed(3).padEnd(10)+p.x.toFixed(3).padEnd(12)+p.y.toFixed(3).padEnd(12)+p.v.toFixed(3)+"\n";});dlBlob(new Blob([txt],{type:"text/plain"}),"trajectory.txt");sounds.success();showToast("✓ TXT");};
  const saveComp=():void=>{savedRef.current=[...savedRef.current.slice(-2),[...trajRef.current]];draw(trajRef.current,frameRef.current,frameRef.current>0);sounds.success();showToast(isAr?"✓ حُفظ المسار":"✓ Path saved");};
  const handleFile=(f:File|null):void=>{if(!f)return;const r=new FileReader();r.onload=e=>{const res=(e.target as FileReader).result as string;setImgSrc(res);setImgB64(res.split(",")[1]);setImgMime(f.type||"image/jpeg");setScanRes(null);setScanProg(0);};r.readAsDataURL(f);};
  const runScan=async():Promise<void>=>{if(!imgB64)return;setScanning(true);setScanProg(0);setScanRes(null);sounds.scan();const steps:Array<[number,string]>=[[10,"تحميل..."],[25,"معالجة..."],[45,"نموذج AI..."],[65,"تحديد..."],[82,"فيزياء..."],[95,"تقرير..."]];let si=0;const iv=setInterval(()=>{if(si<steps.length){setScanProg(steps[si][0]);setScanPhase(steps[si][1]);si++;}},500);try{const r=await analyzeImage(imgB64,imgMime,lang);clearInterval(iv);setScanProg(100);setScanPhase("اكتمل!");setScanRes(r);sounds.success();}catch{clearInterval(iv);setScanRes({hasProjectile:false,imageDescription:"فشل.",confidence:0});}setScanning(false);};

  const analyticsData=trajRef.current.length?trajRef.current.filter((_,i)=>i%Math.max(1,Math.floor(trajRef.current.length/120))===0).map(p=>({xv:getVarVal(p,xVar,params.mass,params.g),yv:getVarVal(p,yVar,params.mass,params.g)})):[];
  const doErr=(user:string,ai:number):ErrResult|null=>{const u=parseFloat(user),a=parseFloat(String(ai));if(isNaN(u)||!user)return null;const abs=Math.abs(u-a),rel=a!==0?(abs/Math.abs(a))*100:0;return{abs:abs.toFixed(4),rel:rel.toFixed(2),good:rel<2,warn:rel<8};};
  const errMetrics:ErrMetric[]=preds?[{key:"range",label:t.range,unit:"م",aiVal:preds.range,desc:"المسافة الكلية"},{key:"maxH",label:t.maxH,unit:"م",aiVal:preds.maxH,desc:"ارتفاع الذروة"},{key:"tF",label:t.tF,unit:"ث",aiVal:preds.tF,desc:"الزمن الإجمالي"}]:[];
  const totalT=trajRef.current.length>0?trajRef.current[trajRef.current.length-1].t:0;
  const errC=(res:ErrResult|null):string=>!res?mut:dark?(res.good?"#eeeeee":res.warn?"#aaaaaa":"#777777"):(res.good?"#111":res.warn?"#555":"#888");
  const is2DActuallyPlaying=playing&&!isPaused;const is3DActuallyPlaying=playing3D&&!isPaused3D;

  const ControlBar=({isPlaying,isP,prog,curtime,totalTime,onPlay,onPause,onResume,onReset,onSeek,spd,setSpd,sRef}:{isPlaying:boolean;isP:boolean;prog:number;curtime:number;totalTime:number;onPlay:()=>void;onPause:()=>void;onResume:()=>void;onReset:()=>void;onSeek:(e:React.ChangeEvent<HTMLInputElement>)=>void;spd:number;setSpd:(s:number)=>void;sRef:React.MutableRefObject<number>})=>{
    const playLbl=isPlaying?(isAr?"إيقاف":"Pause"):isP?(isAr?"إكمال":"Resume"):(isAr?"تشغيل":"Play");
    const handlePT=():void=>{if(isPlaying)onPause();else if(isP)onResume();else onPlay();};
    return(<div dir="ltr" style={{padding:"10px 14px 12px",flexShrink:0}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:mut}}>0.000s</span><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:acc,fontWeight:600}}>{curtime.toFixed(3)}s / {totalTime.toFixed(3)}s</span><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:mut}}>{totalTime.toFixed(3)}s</span></div><div style={{position:"relative",height:22,marginBottom:8}}><div style={{position:"absolute",top:"50%",left:0,right:0,height:4,transform:"translateY(-50%)",borderRadius:2,overflow:"hidden",background:dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.1)"}}><div style={{width:prog+"%",height:"100%",background:dark?"linear-gradient(90deg,#fff,#ccc)":"linear-gradient(90deg,#111,#333)",borderRadius:2,transition:isPlaying?"none":"width .08s"}}/></div><div style={{position:"absolute",top:"50%",left:prog+"%",transform:"translate(-50%,-50%)",width:17,height:17,borderRadius:"50%",background:dark?"#eeeeee":"#fff",border:"2.5px solid "+acc,boxShadow:"0 0 10px rgba(0,0,0,.2)",transition:isPlaying?"none":"left .08s",pointerEvents:"none",zIndex:2}}/><input type="range" min={0} max={100} step={0.1} value={prog} onChange={onSeek} style={{position:"absolute",inset:0,width:"100%",opacity:0,cursor:"pointer",zIndex:3}}/></div><div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><button className="apas-btn" style={Btn("primary")} onClick={handlePT}>{isPlaying?<Pause size={13}/>:<Play size={13}/>}{playLbl}</button><button className="apas-btn" style={Btn()} onClick={onReset}><RotateCcw size={13}/></button><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:mut}}>{t.speed}:</span>{([0.25,0.5,1,2] as number[]).map(s=>(<button key={s} className="apas-btn" onClick={()=>{setSpd(s);sRef.current=s;sounds.click();}} style={{fontFamily:"IBM Plex Mono",fontSize:11,fontWeight:spd===s?700:400,padding:"4px 9px",borderRadius:5,cursor:"pointer",border:"1.5px solid "+(spd===s?acc:bord),background:spd===s?(dark?"#eeeeee":"#111"):"transparent",color:spd===s?(dark?"#000":"#fff"):mut}}>{s}x</button>))}</div></div></div>);
  };

  if(intro)return <IntroScreen onEnter={()=>{setIntro(false);setOnboarding(true);}}/>;
  if(onboarding)return <OnboardingScreen onFinish={()=>{setOnboarding(false);setTimeout(()=>setVis(true),50);}} sounds={sounds}/>;

  const headerBg=dark?"linear-gradient(90deg,rgba(8,8,8,.97),rgba(4,4,4,.97))":"#ffffff";

  return(
    <div dir={isAr?"rtl":"ltr"} style={{fontFamily:"IBM Plex Sans,sans-serif",background:bg,color:col,minHeight:"100vh",display:"flex",flexDirection:"column",fontSize:13,overflow:"hidden",animation:vis?"fadeIn .5s ease forwards":"none"}}>

      <EqModal open={showEqModal} onClose={()=>setShowEqModal(false)} params={params} preds={preds} dark={dark} col={col} bord={bord} acc={acc} mut={mut} ibg={ibg} onDetailedClick={()=>setShowDetailModal(true)} onDeepExplain={handleDeepExplain}/>
      <DetailedCalcModal open={showDetailModal} onClose={()=>setShowDetailModal(false)} params={params} preds={preds} dark={dark} col={col} bord={bord} acc={acc} mut={mut} ibg={ibg} onTermClick={openTerm} onDeepExplain={handleDeepExplain}/>
      <TermInfoModal term={termInfo} onClose={()=>setTermInfo(null)} dark={dark} col={col} bord={bord} mut={mut} ibg={ibg}/>
      <DeepExplainModal state={deepExplain} onClose={()=>setDeepExplain(s=>({...s,open:false}))} dark={dark} col={col} bord={bord} acc={acc} mut={mut} ibg={ibg}/>

      {fsOpen&&!show3D&&(<div style={{position:"fixed",inset:0,zIndex:999999,background:dark?"#0a0a0a":"#fff",display:"flex",flexDirection:"column",overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 8px",flexShrink:0,borderBottom:"1px solid "+bord,background:dark?"#000":"#f0f0f0"}}><div style={{display:"flex",alignItems:"center",gap:8}}><APASLogo size={26} dark={dark}/><span style={{fontFamily:"Orbitron",fontWeight:700,fontSize:13,color:acc}}>APAS — ثنائي الأبعاد</span></div><button className="apas-btn" onClick={()=>{setFsOpen(false);sounds.click();}} style={{background:ibg,border:"1px solid "+bord,borderRadius:8,padding:"6px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:acc,fontFamily:"IBM Plex Mono",fontSize:11}}><Minimize2 size={13}/>{isAr?"خروج":"Exit"}</button></div><canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight-130} style={{flex:1,display:"block",width:"100%",objectFit:"fill"}}/><ControlBar isPlaying={is2DActuallyPlaying} isP={isPaused} prog={progress} curtime={curT} totalTime={totalT} onPlay={handle2DPlay} onPause={handle2DPause} onResume={handle2DResume} onReset={handle2DReset} onSeek={handle2DSeek} spd={speed} setSpd={setSpeed} sRef={speedRef}/></div>)}

      <header style={{background:headerBg,backdropFilter:"blur(24px)",border:"1.5px solid "+bord,margin:"10px 10px 0",borderRadius:12,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54,position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}><APASLogo size={40} dark={dark}/><div><div style={{fontFamily:"Orbitron",fontWeight:800,fontSize:17,letterSpacing:2,color:dark?"#eeeeee":"#111"}}>APAS</div><div style={{fontFamily:"IBM Plex Mono",fontSize:9,color:mut,letterSpacing:2}}>AI Projectile Analysis System</div></div></div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:6,border:"1.5px solid "+(dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.2)"),background:dark?"rgba(255,255,255,.07)":"rgba(0,0,0,.04)",fontFamily:"IBM Plex Mono",fontSize:10,color:dark?"#eeeeee":"#111"}}><div style={{width:5,height:5,borderRadius:"50%",background:dark?"#cccccc":"#333",animation:"pulse 2s infinite"}}/>ONLINE</div>
          <button className="apas-btn" style={Btn()} onClick={()=>{setLang(l=>l==="ar"?"en":"ar");sounds.click();}}><Globe size={13}/>{isAr?"EN":"عر"}</button>
          <button className="apas-btn" style={Btn()} onClick={()=>{setDark(d=>!d);sounds.toggle();}}>{dark?<Sun size={13}/>:<Moon size={13}/>}</button>
        </div>
      </header>

      <div style={{display:"flex",gap:8,padding:"8px 10px 10px",flex:1,position:"relative",zIndex:1,overflow:"hidden"}}>
        {/* Left panel */}
        <div style={{width:248,display:"flex",flexDirection:"column",gap:8,flexShrink:0,overflowY:"auto",maxHeight:"calc(100vh - 80px)",animation:"fadeUp .6s ease forwards .1s",opacity:0}}>
          <ColPanel gl={gl} icon={<Zap size={14}/>} title={t.ctrl} acc={acc} mut={mut} defaultOpen>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {([{k:"v0" as keyof SimParams,l:t.v,u:"m/s",mn:1,mx:500,st:1},{k:"angle" as keyof SimParams,l:t.ang,u:"°",mn:1,mx:89,st:1},{k:"g" as keyof SimParams,l:t.grav,u:"m/s²",mn:.1,mx:25,st:.01},{k:"mass" as keyof SimParams,l:t.mass,u:"kg",mn:.01,mx:100,st:.01},{k:"h0" as keyof SimParams,l:t.h,u:"m",mn:0,mx:500,st:.5}]).map(({k,l,u,mn,mx,st})=>(<ParamRow key={k} label={l} unit={u} value={params[k]} min={mn} max={mx} step={st} acc={acc} col={col} mut={mut} bord={bord} ibg={ibg} dark={dark} onChange={v=>setP(k,v)}/>))}
              <div style={{paddingTop:10,borderTop:"1px solid "+bord}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:params.kDrag>0?10:0}}><div style={{display:"flex",alignItems:"center",gap:7}}><Wind size={13} color={params.kDrag>0?acc:mut}/><span style={{fontFamily:"IBM Plex Sans",fontSize:12.5,fontWeight:500,color:params.kDrag>0?acc:col}}>{t.air}</span></div><div className="apas-btn" onClick={()=>{setP("kDrag",params.kDrag>0?0:.02);sounds.toggle();}} style={{width:34,height:18,borderRadius:9,cursor:"pointer",background:params.kDrag>0?(dark?"#eeeeee":"#111"):(dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.12)"),position:"relative",transition:"background .2s",flexShrink:0}}><div style={{position:"absolute",top:2,left:params.kDrag>0?18:2,width:14,height:14,borderRadius:"50%",background:dark&&params.kDrag>0?"#000":"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/></div></div>{params.kDrag>0&&<div style={{animation:"open .2s ease"}}><ParamRow label={t.dragK} unit="" value={params.kDrag} min={.001} max={.2} step={.001} acc={acc} col={col} mut={mut} bord={bord} ibg={ibg} dark={dark} onChange={v=>setP("kDrag",v)}/></div>}</div>
            </div>
          </ColPanel>
          <ColPanel gl={gl} icon={<Layers size={14}/>} title={t.disp} acc={acc} mut={mut} defaultOpen={false}>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>{([{k:"crit" as keyof DisplayOptions,l:t.crit},{k:"fvec" as keyof DisplayOptions,l:t.fvec},{k:"comp" as keyof DisplayOptions,l:t.comp}]).map(({k,l})=>(<label key={k} style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>{setDisp(o=>({...o,[k]:!o[k]}));sounds.toggle();}}><div style={{width:16,height:16,borderRadius:4,background:disp[k]?(dark?"#eeeeee":"#111"):"transparent",border:"1.5px solid "+(disp[k]?acc:bord),display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0}}>{disp[k]&&<span style={{color:dark?"#000":"#fff",fontSize:11,lineHeight:1}}>✓</span>}</div><span style={{fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:500,color:col}}>{l}</span></label>))}</div>
          </ColPanel>
          <div style={{...gl,padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"12px 16px",cursor:"pointer",userSelect:"none"}} onClick={()=>setIsExportOpen(o=>!o)}><Camera size={14} color={acc}/><span style={{fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:700,color:acc,flex:1}}>{isAr?"تصدير":"Export"}</span><span style={{color:mut,transition:"transform .25s",transform:isExportOpen?"rotate(0)":"rotate(-90deg)",display:"flex"}}><ChevronDown size={14}/></span></div>
            <div style={{maxHeight:isExportOpen?"220px":"0",overflow:"hidden",transition:"max-height .3s ease"}}><div style={{padding:"0 16px 14px",display:"flex",flexDirection:"column",gap:7}}>{([{fn:exportPNG,ico:"📷",lbl:isAr?"تصدير PNG":"PNG"},{fn:exportJSON,ico:"💾",lbl:isAr?"حفظ JSON":"JSON"},{fn:exportTXT,ico:"📄",lbl:isAr?"تصدير TXT":"TXT"}]).map(({fn,ico,lbl})=>(<button key={lbl} className="apas-btn" style={{...Btn(),width:"100%",justifyContent:"center"}} onClick={fn}><span style={{fontSize:13}}>{ico}</span>{lbl}</button>))}<button className="apas-btn" style={{...Btn("success"),width:"100%",justifyContent:"center"}} onClick={saveComp}>💾 {isAr?"حفظ المسار للمقارنة":"Save for Compare"}</button></div></div>
          </div>
        </div>

        {/* Center */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minWidth:0,animation:"fadeUp .6s ease forwards .2s",opacity:0,overflowY:"auto",maxHeight:"calc(100vh - 80px)"}}>
          <div style={{...gl,display:"flex",flexDirection:"column"}}>
            {show3D&&points3D.length>1?(
              <div style={{position:"relative",height:380,overflow:"hidden",borderRadius:"10px 10px 0 0",border:"1px solid "+bord}}>
                <Projectile3DInline points={points3D} showFvec={disp.fvec} params={params} lang={lang} frame3DRef={frame3DRef} playing3DRef={playing3DRef} speed3DRef={speed3DRef} onFrameTick={on3DFrameTick} onEnd3D={on3DEnd}/>
                <button className="apas-btn" onClick={()=>{setFs3DOpen(true);sounds.click();}} style={{position:"absolute",top:36,right:10,background:dark?"rgba(0,0,0,.75)":"rgba(255,255,255,.92)",backdropFilter:"blur(8px)",border:"1.5px solid "+bord,borderRadius:7,padding:"6px 7px",cursor:"pointer",display:"flex",alignItems:"center",color:acc,lineHeight:0,zIndex:10}}><Maximize2 size={14}/></button>
              </div>
            ):(
              <div style={{position:"relative",padding:"12px 12px 0"}}>
                <canvas ref={canvasRef} width={720} height={340} style={{width:"100%",display:"block",borderRadius:8,border:"1px solid "+bord}}/>
                <button className="apas-btn" onClick={()=>{setFsOpen(true);sounds.click();}} style={{position:"absolute",top:20,right:22,background:dark?"rgba(0,0,0,.7)":"rgba(255,255,255,.9)",backdropFilter:"blur(8px)",border:"1.5px solid "+bord,borderRadius:7,padding:"6px 7px",cursor:"pointer",display:"flex",alignItems:"center",color:acc,lineHeight:0}}><Maximize2 size={14}/></button>
                <div style={{position:"absolute",top:20,left:22,display:"flex",gap:5}}>{["Space="+(isAr?"إيقاف":"Pause"),"R="+(isAr?"إعادة":"Reset")].map(h=>(<div key={h} style={{padding:"3px 8px",borderRadius:5,background:dark?"rgba(0,0,0,.7)":"rgba(255,255,255,.9)",backdropFilter:"blur(8px)",border:"1px solid "+bord,fontFamily:"IBM Plex Mono",fontSize:9,color:mut}}>{h}</div>))}</div>
              </div>
            )}
            <div style={{padding:"8px 14px 4px",display:"flex",alignItems:"center",gap:8,borderTop:"1px solid "+bord}}>
              <button className="apas-btn" onClick={()=>{setShow3D(v=>!v);if(show3D){playing3DRef.current=false;setPlaying3D(false);}sounds.toggle();}} style={{fontFamily:"IBM Plex Sans",fontSize:12,fontWeight:600,padding:"7px 14px",borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",gap:6,background:show3D?(dark?"#eeeeee":"#1a237e"):ibg,color:show3D?(dark?"#000":"#fff"):col,border:"1.5px solid "+(show3D?(dark?"#eeeeee":"#1a237e"):bord)}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <div dir="ltr">{show3D?t.hide3d:t.view3d}</div>
              </button>
            </div>
            {show3D?(<ControlBar isPlaying={is3DActuallyPlaying} isP={isPaused3D} prog={progress3D} curtime={curT3D} totalTime={totalT} onPlay={handle3DPlay} onPause={handle3DPause} onResume={handle3DResume} onReset={handle3DReset} onSeek={handle3DSeek} spd={speed3D} setSpd={setSpeed3D} sRef={speed3DRef}/>):(<ControlBar isPlaying={is2DActuallyPlaying} isP={isPaused} prog={progress} curtime={curT} totalTime={totalT} onPlay={handle2DPlay} onPause={handle2DPause} onResume={handle2DResume} onReset={handle2DReset} onSeek={handle2DSeek} spd={speed} setSpd={setSpeed} sRef={speedRef}/>)}
          </div>

          {show3D&&points3D.length>1&&fs3DOpen&&(<div style={{position:"fixed",inset:0,zIndex:999999,background:dark?"#0a0a0a":"#fff",display:"flex",flexDirection:"column",overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 8px",flexShrink:0,borderBottom:"1px solid "+bord,background:dark?"#000":"#f0f0f0"}}><div style={{display:"flex",alignItems:"center",gap:8}}><APASLogo size={26} dark={dark}/><span style={{fontFamily:"Orbitron",fontWeight:700,fontSize:13,color:acc}}>APAS — ثلاثي الأبعاد</span></div><button className="apas-btn" onClick={()=>{setFs3DOpen(false);sounds.click();}} style={{background:ibg,border:"1px solid "+bord,borderRadius:8,padding:"6px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:acc,fontFamily:"IBM Plex Mono",fontSize:11}}><Minimize2 size={13}/>{isAr?"خروج":"Exit"}</button></div><div style={{flex:1,minHeight:0,height:"calc(100vh-130px)"}}><Projectile3DInline points={points3D} showFvec={disp.fvec} params={params} lang={lang} frame3DRef={frame3DRef} playing3DRef={playing3DRef} speed3DRef={speed3DRef} onFrameTick={on3DFrameTick} onEnd3D={on3DEnd}/></div><ControlBar isPlaying={is3DActuallyPlaying} isP={isPaused3D} prog={progress3D} curtime={curT3D} totalTime={totalT} onPlay={handle3DPlay} onPause={handle3DPause} onResume={handle3DResume} onReset={handle3DReset} onSeek={handle3DSeek} spd={speed3D} setSpd={setSpeed3D} sRef={speed3DRef}/></div>)}

          {preds&&(<div style={{...gl,padding:16}} key={predKey}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:13}}><div style={{width:8,height:8,borderRadius:"50%",background:acc,animation:"pulse 2s infinite"}}/><span style={{fontFamily:"Orbitron",fontSize:11,fontWeight:700,color:acc,textTransform:"uppercase",letterSpacing:2}}>{t.preds}</span></div><div style={{display:"flex",gap:8}}><PredCard icon="🎯" label={t.range} value={preds.range.toFixed(2)} unit="م" color={acc} borderColor={bord} delay={0} dark={dark}/><PredCard icon="⬆️" label={t.maxH} value={preds.maxH.toFixed(2)} unit="م" color={purp} borderColor={bord} delay={120} dark={dark}/><PredCard icon="⏱️" label={t.tF} value={preds.tF.toFixed(2)} unit="ث" color={grn} borderColor={bord} delay={240} dark={dark}/><PredCard icon="✨" label={t.conf} value={preds.conf.toFixed(1)} unit="%" color={dark?"#bbbbbb":"#555"} borderColor={bord} delay={360} dark={dark}/></div></div>)}

          <ColPanel gl={gl} icon={<TrendingUp size={14}/>} title={t.chart} acc={acc} mut={mut} defaultOpen>
            <div style={{display:"flex",gap:8,marginBottom:10}}>{([{l:isAr?"محور X":"X Axis",v:xVar,s:setXVar},{l:isAr?"محور Y":"Y Axis",v:yVar,s:setYVar}]).map(({l,v,s})=>(<div key={l} style={{flex:1}}><div style={{fontFamily:"IBM Plex Sans",fontSize:12,fontWeight:500,color:col,marginBottom:5}}>{l}</div><select value={v} onChange={e=>{s(e.target.value);sounds.click();}} style={{background:dark?"#1c1c1c":ibg,border:"1.5px solid "+bord,borderRadius:6,color:acc,fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:700,padding:"5px 9px",outline:"none",cursor:"pointer",width:"100%"}}>{VARS.map(vv=><option key={vv} value={vv}>{varLabel(vv)}</option>)}</select></div>))}</div>
            <div dir="ltr" style={{height:155}}><ResponsiveContainer width="100%" height="100%"><LineChart data={analyticsData} margin={{top:4,right:8,bottom:4,left:-18}}><CartesianGrid strokeDasharray="3 3" stroke={dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.07)"}/><XAxis dataKey="xv" type="number" domain={[0,"auto"]} tickFormatter={(v:number)=>+v.toFixed(1)} stroke={mut} tick={{fontSize:10,fontFamily:"IBM Plex Mono",fill:mut}}/><YAxis stroke={mut} domain={[0,"auto"]} tickFormatter={(v:number)=>+v.toFixed(1)} tick={{fontSize:10,fontFamily:"IBM Plex Mono",fill:mut}}/><Tooltip contentStyle={{background:dark?"#1c1c1c":"#fff",border:"1.5px solid "+bord,borderRadius:8,fontFamily:"IBM Plex Mono",fontSize:11,color:col}} formatter={(v:number)=>[(+v).toFixed(3),varLabel(yVar)]}/><Line type="monotone" dataKey="yv" stroke={dark?"#eeeeee":"#111"} strokeWidth={2.5} dot={false} activeDot={{r:4,fill:dark?"#eeeeee":"#111"}}/></LineChart></ResponsiveContainer></div>
          </ColPanel>

          <ColPanel gl={gl} icon={<Target size={14}/>} title={t.err} acc={acc} mut={mut} defaultOpen={false}>
            {!preds?<div style={{textAlign:"center",padding:"18px 0",color:mut}}>جاري التحميل...</div>:(<div style={{display:"flex",flexDirection:"column",gap:12}}>{errMetrics.map(({key,label,unit,aiVal,desc})=>{const user=theoVals[key],res=doErr(user,aiVal),ec=errC(res);return(<div key={key} style={{borderRadius:12,border:"1.5px solid "+(res?ec+"55":bord),background:dark?"rgba(255,255,255,.02)":"#fff",overflow:"hidden"}}><div style={{padding:"11px 16px 9px",borderBottom:"1px solid "+(dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.07)"),display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:dark?"rgba(255,255,255,.03)":"#f9f9f9"}}><div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontFamily:"IBM Plex Sans",fontSize:14,fontWeight:700,color:acc}}>{label}</span><span style={{fontFamily:"IBM Plex Sans",fontSize:12,color:mut}}>{desc}</span></div>{res&&<div style={{padding:"3px 10px",borderRadius:20,background:ec+"18",border:"1px solid "+ec+"44",fontFamily:"IBM Plex Mono",fontSize:10,fontWeight:700,color:ec}}>{res.good?"✓ دقيق":res.warn?"⚠ متوسط":"✗ كبير"}</div>}</div><div style={{padding:"11px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div style={{padding:"9px 12px",borderRadius:9,background:dark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)",border:"1.5px solid "+bord}}><div style={{fontFamily:"IBM Plex Sans",fontSize:11,color:mut,marginBottom:5}}>{t.aiVal}</div><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontFamily:"IBM Plex Mono",fontSize:20,fontWeight:800,color:acc}}>{aiVal.toFixed(3)}</span><span style={{fontFamily:"IBM Plex Sans",fontSize:12,color:mut}}>{unit}</span></div></div><div style={{padding:"9px 12px",borderRadius:9,background:res?(ec+"08"):ibg,border:"1.5px solid "+(res?(ec+"44"):bord)}}><div style={{fontFamily:"IBM Plex Sans",fontSize:11,color:mut,marginBottom:5}}>{t.yourVal}</div><div style={{display:"flex",alignItems:"baseline",gap:4}}><input type="number" placeholder="0.000" value={user} onChange={e=>setTheoVals(p=>({...p,[key]:e.target.value}))} style={{fontFamily:"IBM Plex Mono",fontSize:20,fontWeight:800,color:res?ec:col,background:"transparent",border:"none",outline:"none",width:"100%",padding:0}}/><span style={{fontFamily:"IBM Plex Sans",fontSize:12,color:mut,flexShrink:0}}>{unit}</span></div></div></div>{res&&(<div style={{padding:"0 16px 12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,animation:"popIn .3s ease"}}>{([{l:t.absErr,v:res.abs+" "+unit},{l:t.relErr,v:res.rel+"%"}]).map(({l,v:val})=>(<div key={l} style={{padding:"8px 10px",borderRadius:8,background:ec+"0a",border:"1.5px solid "+ec+"33",textAlign:"center"}}><div style={{fontFamily:"IBM Plex Sans",fontSize:11,color:mut,marginBottom:3}}>{l}</div><div style={{fontFamily:"IBM Plex Mono",fontSize:14,fontWeight:700,color:ec}}>{val}</div></div>))}</div>)}</div>);})}</div>)}
          </ColPanel>

          <ColPanel gl={{...gl,border:"1.5px solid "+(dark?"rgba(255,255,255,.18)":"#111")}} icon={<FlaskConical size={14} color={acc}/>} title={t.eqs} acc={acc} mut={mut} defaultOpen={false}>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>{preds?([{sym:"Vx₀",val:(params.v0*Math.cos(params.angle*Math.PI/180)).toFixed(2),unit:"م/ث"},{sym:"Fg",val:(params.mass*params.g).toFixed(2),unit:"N"},{sym:"R",val:preds.range.toFixed(2),unit:"م"}]).map(({sym,val,unit})=>(<div key={sym} style={{padding:"8px 10px",borderRadius:9,border:"1.5px solid "+bord,background:dark?"rgba(255,255,255,.04)":"#f9f9f9",textAlign:"center"}}><div style={{fontFamily:"IBM Plex Mono",fontWeight:800,fontSize:11,color:acc,marginBottom:3}}>{sym}</div><div style={{fontFamily:"IBM Plex Mono",fontWeight:800,fontSize:14,color:acc}}>{val}</div><div style={{fontFamily:"IBM Plex Sans",fontSize:9,color:mut}}>{unit}</div></div>)):<div style={{gridColumn:"1/-1",textAlign:"center",color:mut,fontSize:12}}>جاري التحميل...</div>}</div>
              <button className="apas-btn" onClick={()=>{setShowEqModal(true);sounds.scan();}} style={{width:"100%",justifyContent:"center",padding:"11px 0",borderRadius:10,background:dark?"#eeeeee":"#111",border:"none",color:dark?"#000":"#fff",fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 12px rgba(0,0,0,.2)"}}><BookOpen size={15}/>{t.openEqs}</button>
            </div>
          </ColPanel>
        </div>

        {/* Right panel */}
        <div style={{width:284,display:"flex",flexDirection:"column",gap:8,flexShrink:0,overflowY:"auto",maxHeight:"calc(100vh - 80px)",animation:"fadeUp .6s ease forwards .3s",opacity:0}}>
          <div style={{...gl,padding:13,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}><Eye size={14} color={acc}/><span style={{fontFamily:"IBM Plex Sans",fontSize:13,fontWeight:700,color:acc}}>{t.vision}</span>{scanRes&&<div style={{marginLeft:"auto",padding:"3px 9px",borderRadius:5,fontFamily:"IBM Plex Mono",fontSize:10,color:scanRes.hasProjectile?(dark?"#000":"#fff"):"#fff",background:scanRes.hasProjectile?acc:(dark?"rgba(255,255,255,.2)":"#555"),border:"1.5px solid "+(scanRes.hasProjectile?acc:bord)}}>{scanRes.hasProjectile?t.detected:t.nodet}</div>}</div>
            <div style={{borderRadius:9,border:"1.5px dashed "+(imgSrc?bord:acc),cursor:"pointer",position:"relative",overflow:"hidden",minHeight:imgSrc?"auto":90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:ibg}} onClick={()=>fileRef.current?.click()} onDragOver={(e:React.DragEvent<HTMLDivElement>)=>e.preventDefault()} onDrop={(e:React.DragEvent<HTMLDivElement>)=>{e.preventDefault();handleFile(e.dataTransfer.files[0]??null);}}>{imgSrc?(<div style={{position:"relative",width:"100%"}}><img src={imgSrc} alt="" style={{width:"100%",borderRadius:7,display:"block",maxHeight:130,objectFit:"cover"}}/>{scanning&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:7,borderRadius:7}}><div style={{width:28,height:28,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite"}}/><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:"#fff"}}>{scanPhase}</span><div style={{width:"60%",height:2,background:"rgba(255,255,255,.2)",borderRadius:2,overflow:"hidden"}}><div style={{width:scanProg+"%",height:"100%",background:"#fff",transition:"width .35s"}}/></div></div>}</div>):(<><div style={{width:34,height:34,borderRadius:"50%",background:ibg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:7,animation:"bounce 2.5s ease-in-out infinite"}}><Upload size={14} color={acc}/></div><span style={{fontSize:12,color:mut,textAlign:"center",lineHeight:1.7,whiteSpace:"pre-line"}}>{t.upload}</span></>)}<input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0]??null)}/></div>
            {imgSrc&&!scanning&&!scanRes&&<button className="apas-btn" style={{...Btn("primary"),justifyContent:"center"}} onClick={runScan}><Scan size={13}/>{t.scan}</button>}
            {imgSrc&&!scanning&&scanRes&&<button className="apas-btn" style={{...Btn(),justifyContent:"center"}} onClick={()=>{setImgSrc(null);setImgB64(null);setScanRes(null);setScanProg(0);sounds.click();}}>↺ {isAr?"صورة جديدة":"New"}</button>}
            {scanRes&&!scanning&&(<div style={{display:"flex",flexDirection:"column",gap:8,animation:"fadeIn .5s ease"}}><div style={{padding:"9px 12px",borderRadius:9,background:ibg,border:"1.5px solid "+bord}}><p style={{fontSize:12.5,color:col,lineHeight:1.7}}>{scanRes.imageDescription}</p></div>{scanRes.hasProjectile&&scanRes.physicsData&&(<><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:9,background:dark?"#eeeeee":"#111",border:"1.5px solid "+(dark?"rgba(255,255,255,.2)":"#111")}}><span style={{fontFamily:"IBM Plex Sans",fontSize:13,color:dark?"#000":"#fff",fontWeight:700}}>🎯 {scanRes.projectileType}</span><span style={{fontFamily:"IBM Plex Mono",fontSize:11,color:dark?"rgba(0,0,0,.55)":"rgba(255,255,255,.65)"}}>{scanRes.confidence}%</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>{([["الكتلة","Mass",scanRes.physicsData.estimatedMass],["القطر","Diam.",scanRes.physicsData.estimatedDiameter],["السرعة","Velocity",scanRes.physicsData.typicalVelocity],["السحب","Drag",scanRes.physicsData.dragCoefficient],["الزاوية","Angle",scanRes.physicsData.launchAngleTypical],["المدى","Range",scanRes.physicsData.maxRangeTypical]] as [string,string,string|undefined][]).filter(([,,v])=>v&&v!=="N/A").map(([arL,enL,v])=>(<div key={arL} style={{padding:"6px 10px",borderRadius:7,border:"1.5px solid "+bord,background:dark?"rgba(255,255,255,.04)":"#fafafa"}}><div style={{fontFamily:"IBM Plex Sans",fontSize:10,color:mut,marginBottom:2}}>{isAr?arL:enL}</div><div style={{fontFamily:"IBM Plex Mono",fontSize:11.5,color:col,fontWeight:500,wordBreak:"break-word"}}>{v}</div></div>))}</div>{scanRes.physicsData.interestingFact&&<div style={{padding:"8px 12px",borderRadius:8,border:"1.5px solid "+bord,background:ibg}}><p style={{fontSize:12,color:mut,lineHeight:1.65}}>{scanRes.physicsData.interestingFact}</p></div>}{scanRes.suggestedSimParams&&<button className="apas-btn" style={{...Btn("primary"),justifyContent:"center"}} onClick={()=>{setParams(p=>({...p,...scanRes.suggestedSimParams,kDrag:0}));sounds.success();}}><Zap size={13}/>{t.apply}</button>}</>)}</div>)}
          </div>
          <InlineChat params={params} lang={lang} dark={dark} col={col} bord={bord} ibg={ibg} mut={mut} acc={acc}/>
        </div>
      </div>

      <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%) translateY("+(toastMsg?"0":"12px")+")",zIndex:999998,padding:"10px 24px",borderRadius:10,background:dark?"#eeeeee":"#111",color:dark?"#000":"#fff",fontFamily:"IBM Plex Mono",fontSize:13,fontWeight:600,boxShadow:"0 8px 30px rgba(0,0,0,.3)",opacity:toastMsg?1:0,transition:"opacity .25s,transform .25s",pointerEvents:"none"}}>{toastMsg}</div>
    </div>
  );
}
