"use client";
import { useEffect, useRef } from "react";
export function PostComposer({ children, initiallyOpen = false }: { children: React.ReactNode; initiallyOpen?: boolean }) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const openFromLink = () => { if (location.hash === "#nieuw" && details.current) details.current.open = true; };
    // Also handles repeated clicks on the same #nieuw link after collapsing.
    const click = (event: MouseEvent) => { const link = (event.target as Element)?.closest?.("a"); if (link && new URL(link.href).pathname === location.pathname && new URL(link.href).hash === "#nieuw" && details.current) details.current.open = true; };
    openFromLink(); window.addEventListener("hashchange",openFromLink); document.addEventListener("click",click);
    return () => { window.removeEventListener("hashchange",openFromLink); document.removeEventListener("click",click); };
  }, []);
  return <details ref={details} className="post-composer home-composer" id="nieuw" open={initiallyOpen}>{children}</details>;
}
