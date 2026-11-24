import { useEffect, useRef, useState } from 'react';
const QUICK = [
  ['كيف نلعب؟','القائد يعطي كلمة واحدة وعددًا، والفريق يحاول كشف الكلمات المرتبطة بها. انتبهوا من بطاقة الفريق الآخر والبطاقة السوداء.'],
  ['شو البطاقة السوداء؟','بالطور الكلاسيكي كشف البطاقة السوداء ينهي الجولة بخسارة الفريق الذي كشفها.'],
  ['كيف نفوز؟','بالطور الكلاسيكي يفوز أول فريق يكشف جميع بطاقاته، أو إذا كشف الخصم البطاقة السوداء.'],
] as const;
export function NashmiGuide() {
  const [open,setOpen]=useState(false);
  const [question,setQuestion]=useState('');
  const [reply,setReply]=useState('');
  const [provider,setProvider]=useState('');
  const [busy,setBusy]=useState(false);
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  function close(){request.current?.abort();request.current=null;setBusy(false);setOpen(false);}
  async function ask(){
    const message=question.trim(); if (!message || busy) return;
    const controller=new AbortController(); request.current=controller;
    setBusy(true);setReply('');setProvider('');
    const timeout=window.setTimeout(()=>controller.abort(),13000);
    try{
      const res=await fetch('/api/nashmi/rules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message}),signal:controller.signal});
      const data=await res.json(); if(request.current!==controller)return;
      if(!res.ok||typeof data.reply!=='string')throw new Error('unavailable');
      setReply(data.reply);setProvider(data.provider==='nashmi_gemini'?'نشمي · Gemini':'دليل محلي');
    }catch{if(request.current===controller){setReply('نشمي مش متاح هسا. جرّب أزرار شرح القواعد، واللعب مستمر عادي.');setProvider('دليل محلي');}}
    finally{window.clearTimeout(timeout);if(request.current===controller){request.current=null;setBusy(false);}}
  }
  return <><button type="button" className="cn-extra-btn cn-nashmi-trigger" onClick={()=>setOpen(true)}>✦ اسأل نشمي</button>{open&&<div className="cn-nashmi-backdrop" onClick={close} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape')close();}}>
    <section role="dialog" aria-modal="true" aria-label="نشمي" className="cn-nashmi-panel" onClick={e=>e.stopPropagation()}>
      <header><div><b>✦ نشمي</b><small>مساعد قواعد كود نيمز</small></div><button type="button" className="cn-extra-btn" onClick={close} aria-label="إغلاق">✕</button></header>
      <p>اسأل عن القواعد فقط. نشمي ما بشوف البطاقات السرية وما بقرر نتيجة الجولة.</p>
      <div className="cn-nashmi-quick">{QUICK.map(([q,a])=><button type="button" key={q} className="cn-extra-btn" onClick={()=>{request.current?.abort();request.current=null;setBusy(false);setReply(a);setProvider('دليل محلي');}}>{q}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();void ask();}}><label htmlFor="cn-nashmi-question">سؤالك</label><textarea id="cn-nashmi-question" value={question} maxLength={400} rows={3} onChange={e=>setQuestion(e.target.value)} placeholder="مثلاً: متى ينتهي دور الفريق؟"/><button type="submit" className="cn-extra-btn cn-nashmi-trigger" disabled={busy||!question.trim()}>{busy?'جارٍ الرد…':'اسأل'}</button></form>
      {reply&&<div className="cn-nashmi-reply" role="status"><small>{provider}</small><p>{reply}</p></div>}
    </section></div>}</>;
}
