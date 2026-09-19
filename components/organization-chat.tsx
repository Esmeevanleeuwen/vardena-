"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { sendGroupMessage } from "@/app/organization-actions";
import type { OrgMessage } from "@/lib/organization-types";
export function OrganizationChat({ initial,orgId,slug,viewerId,page }: { initial:OrgMessage[];orgId:string;slug:string;viewerId:string;page:number }) {
  const [messages,setMessages]=useState(initial),[body,setBody]=useState(""),[error,setError]=useState(""),[connection,setConnection]=useState(""),[sending,setSending]=useState(false),[accessLost,setAccessLost]=useState(false);
  const busy=useRef(false),version=useRef(0),list=useRef<HTMLDivElement>(null),nearBottom=useRef(true);
  useEffect(()=>{
    let active=true,running=false;
    const controller=new AbortController();
    async function refresh(){
      if(running||busy.current||document.visibilityState!=="visible")return;
      running=true;const requestVersion=version.current;
      try{
        const response=await fetch(`/api/organisaties/${orgId}/chat?pagina=${page}`,{cache:"no-store",signal:controller.signal});
        if(response.status===401||response.status===403){if(active){setMessages([]);setAccessLost(true);setConnection("Je hebt geen toegang meer tot deze groep. Log opnieuw in of bekijk je lidmaatschap.");}return;}
        if(!response.ok)throw new Error("refresh");
        const data=await response.json();
        if(active&&requestVersion===version.current){setMessages(data.messages);setConnection("");setAccessLost(false);}
      }catch{if(active)setConnection("Nieuwe berichten ophalen lukt even niet. We proberen het opnieuw.");}
      finally{running=false;}
    }
    const timer=window.setInterval(refresh,5000);document.addEventListener("visibilitychange",refresh);
    return()=>{active=false;controller.abort();window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[orgId,page]);
  const lastId=messages.at(-1)?.id;
  useEffect(()=>{if(nearBottom.current&&list.current)list.current.scrollTop=list.current.scrollHeight;},[lastId]);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy.current||!body.trim())return;
    busy.current=true;version.current++;setSending(true);setError("");
    try{const result=await sendGroupMessage(orgId,body);if("error"in result)setError(result.error);else{nearBottom.current=true;setMessages(previous=>[...previous.filter(m=>m.id!==result.message.id),result.message].slice(-50));setBody("");}}
    catch{setError("Het bericht is niet verstuurd. Je tekst is bewaard.");}
    finally{busy.current=false;setSending(false);}
  }
  return <div className="message-panel"><p className="group-chat-note">Alle toegelaten leden kunnen dit gesprek en eerdere berichten lezen.</p><div className="message-stream" role="log" aria-label="Groepschat" aria-live="polite" ref={list} onScroll={event=>{const el=event.currentTarget;nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<100;}}>
    {messages.length?messages.map(message=><div key={message.id} className={`message-bubble ${message.sender_id===viewerId?"outgoing":"incoming"}`}><strong className="group-sender">{message.name}</strong><p>{message.body}</p><time className="message-meta" dateTime={message.created_at}>{new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Amsterdam"}).format(new Date(message.created_at))}</time></div>):<div className="conversation-empty"><h2>{accessLost?"Toegang gesloten":"Begin het gesprek."}</h2><p>Stem met elkaar af, deel bronnen en stel vragen.</p></div>}
  </div>{connection?<p className="connection-note" role="status">{connection}</p>:null}
    {page===1&&!accessLost?<form className="message-form" onSubmit={submit}><label className="sr-only" htmlFor="group-message">Bericht aan de groep</label><textarea id="group-message" value={body} onChange={event=>setBody(event.target.value)} required maxLength={3000} rows={3} disabled={sending} placeholder="Schrijf aan de groep…" onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>{error?<p className="inline-error" role="alert">{error}</p>:null}<div className="composer-foot"><small>{body.length}/3000 · Shift + Enter voor een nieuwe regel</small><button className="button small" disabled={sending||!body.trim()}>{sending?"Versturen…":"Versturen"}</button></div></form>:<p className="social-notice"><Link href={`/organisaties/${slug}${accessLost?"":"/groep?tab=chat"}`}>{accessLost?"Bekijk organisatie →":"Nieuwste berichten →"}</Link></p>}
  </div>;
}
