import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Search, User, Moon, Sun, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { menuForView } from "@/lib/navigation";
import { VIEWS } from "@/lib/roles";
import { useAuth } from "@/contexts/AuthContext";

export function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user, view, logout } = useAuth();
  const onDashboard = useLocation().pathname === VIEWS[view].home;
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  // Search only ever offers pages this authorisation can actually open.
  const destinations = useMemo(() => menuForView(view).flatMap(group => group.items.map(item => ({ ...item, group: group.title }))), [view]);
  const results = query.trim() ? destinations.filter(item => `${item.title} ${item.group}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : destinations.slice(0, 6);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-border/70 bg-background/90 px-3 backdrop-blur-xl sm:h-[68px] sm:px-6 lg:px-8">
      <div className="flex items-center gap-3"><SidebarTrigger className="h-9 w-9 rounded-xl" /><div className="hidden sm:block"><p className="text-xs text-muted-foreground">Academic year</p><p className="text-sm font-semibold">2026–27</p></div></div>
      <div className="relative mx-4 hidden w-full max-w-xl md:block">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <button onClick={() => setSearchOpen(true)} className="flex h-10 w-full items-center rounded-xl border border-border bg-card/80 pl-10 pr-3 text-left text-sm text-muted-foreground shadow-sm transition hover:border-foreground/20">
          Find anything… <kbd className="ml-auto rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘ K</kbd>
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {/* A persistent shortcut everywhere except the dashboard, which already
            offers it as its own primary action — outline so that when a page
            does have a filled button, there is still only one focal point. */}
        {!onDashboard && view !== "student" && <Button asChild size="sm" variant="outline" className="hidden sm:flex"><Link to="/student/admission-form"><Plus />New admission</Link></Button>}
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={()=>setSearchOpen(true)}><Search/></Button>
        <Button variant="ghost" size="icon" aria-label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />}</Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications, unread"><Bell /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-background" /></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 rounded-full p-1"><Avatar className="h-8 w-8"><AvatarFallback className="bg-foreground text-background text-xs">{user?.name.split(" ").map(p=>p[0]).join("").slice(0,2)||"ID"}</AvatarFallback></Avatar></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel><span className="block">{user?.name}</span><span className="text-xs font-normal text-muted-foreground">{user?.role.replaceAll("_"," ")}</span></DropdownMenuLabel><DropdownMenuSeparator/>{view==="student"&&<DropdownMenuItem asChild><Link to="/me/profile"><User className="mr-2 h-4 w-4"/>My profile</Link></DropdownMenuItem>}{view==="admin"&&<DropdownMenuItem asChild><Link to="/settings/general"><User className="mr-2 h-4 w-4"/>Organisation settings</Link></DropdownMenuItem>}{view==="franchise"&&<DropdownMenuItem asChild><Link to="/branch/website-settings"><User className="mr-2 h-4 w-4"/>Branch settings</Link></DropdownMenuItem>}<DropdownMenuSeparator/><DropdownMenuItem className="text-destructive" onClick={()=>void logout()}>Log out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>

      {searchOpen && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-[7vh] backdrop-blur-sm sm:px-4 sm:pt-[12vh]" onMouseDown={() => setSearchOpen(false)}>
        <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border bg-card shadow-2xl" onMouseDown={e => e.stopPropagation()}>
          <div className="flex items-center border-b px-4"><Search className="h-5 w-5 text-muted-foreground"/><Input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search students, fees, courses or any page…" className="h-14 border-0 bg-transparent shadow-none focus-visible:ring-0"/><Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}><X/></Button></div>
          <div className="max-h-[55vh] overflow-auto p-2"><p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{query ? "Best matches" : "Popular destinations"}</p>{results.map(item => <Link key={item.url} to={item.url} onClick={() => {setSearchOpen(false);setQuery("");}} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted"><item.icon className="h-4 w-4"/></span><span><span className="block text-sm font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{item.group}</span></span></Link>)}</div>
          <div className="hidden items-center gap-5 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground sm:flex"><span>↑↓ Navigate</span><span>↵ Open</span><span>Esc Close</span></div>
        </div>
      </div>}
    </header>
  );
}
