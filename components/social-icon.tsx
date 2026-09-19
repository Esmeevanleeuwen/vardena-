export type IconName = "like" | "dislike" | "share" | "mail" | "home" | "users" | "person" | "arrow";
export function SocialIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    like: <><path d="M7 10h-4v11h4M7 10l5-8c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7Z" /></>,
    dislike: <g transform="rotate(180 12 12)"><path d="M7 10h-4v11h4M7 10l5-8c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7Z" /></g>,
    share: <><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></>,
    home: <><path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z"/></>,
    users: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6m2 4a6 6 0 0 1 3 5v2"/></>,
    person: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
    arrow: <><path d="m10 5-7 7 7 7M3 12h18"/></>,
  };
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={large ? "social-avatar large" : "social-avatar"} aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "V"}</span>;
}
