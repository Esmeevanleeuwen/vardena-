export function Manifesto({text}:{text:string}){
  return <div className="org-manifesto">{text.split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph.split(/\*\*(.*?)\*\*/g).map((part,i)=>i%2?<strong key={i}>{part}</strong>:part)}</p>)}</div>;
}
