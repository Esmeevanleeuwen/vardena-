export type IconName = "like" | "dislike" | "share" | "mail" | "home" | "users" | "person" | "arrow" | "building" | "bookmark" | "comment" | "search" | "photo" | "megaphone" | "grid" | "spark" | "list";
export function SocialIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    list: <><circle cx="5" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="19" r="1"/><path d="M10 5h11M10 12h11M10 19h11"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4Z"/>,
    comment: <path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1-1-5 9 9 0 0 1 18 0Z"/>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    photo: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
    megaphone: <><path d="m3 9 17-6v18L3 15ZM7 16l1 5h4l-1-4M3 9v6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>,
    like: <><path d="M7 10h-4v11h4M7 10l5-8c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7Z" /></>,
    dislike: <g transform="rotate(180 12 12)"><path d="M7 10h-4v11h4M7 10l5-8c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7Z" /></g>,
    share: <><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></>,
    home: <><path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z"/></>,
    users: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6m2 4a6 6 0 0 1 3 5v2"/></>,
    person: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
    building: <><path d="M4 21V5h10v16M14 11h6v10M2 21h20M7 8h4M7 12h4M7 16h4M17 14v3"/></>,
    arrow: <><path d="m10 5-7 7 7 7M3 12h18"/></>,
  };
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={large ? "social-avatar large" : "social-avatar"} aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "V"}</span>;
}
