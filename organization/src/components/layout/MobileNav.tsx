import { Link, useLocation } from "react-router-dom";
import { ClipboardCheck, Home, IndianRupee, UserRoundPlus, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", url: "/", icon: Home },
  { label: "Reception", url: "/reception/enquiry", icon: UserRoundPlus },
  { label: "Students", url: "/student/view", icon: UsersRound },
  { label: "Fees", url: "/fee/collection", icon: IndianRupee },
  { label: "Attendance", url: "/attendance/mark", icon: ClipboardCheck },
];

export function MobileNav() {
  const location = useLocation();
  return <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 px-2 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_hsl(var(--foreground)/.08)] backdrop-blur-xl md:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5">
      {items.map(item => { const active = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url.split("/").slice(0,2).join("/")); return <Link key={item.url} to={item.url} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium text-muted-foreground transition active:scale-95", active && "bg-primary/15 text-foreground")}><item.icon className={cn("h-[18px] w-[18px]",active&&"text-brand-ink")}/><span className="truncate">{item.label}</span></Link> })}
    </div>
  </nav>;
}
