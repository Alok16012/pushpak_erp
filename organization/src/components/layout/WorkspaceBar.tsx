import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Cloud, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { menuItems } from "./AppSidebar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formRoutes = /\/(create|add|setup|template|allocation|assign|collection|mark|general|gateway|qr|admission-form|question-paper-builder|access-control|website-settings|voucher)/;

export function WorkspaceBar() {
  const location = useLocation();
  const { toast } = useToast();
  const group = useMemo(() => menuItems.find(item => item.items.some(child => location.pathname === child.url)), [location.pathname]);
  const isWorkflow = formRoutes.test(location.pathname);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isWorkflow) return;
    const updateProgress = () => {
      const fields = Array.from(document.querySelectorAll<HTMLElement>("main input:not([type=hidden]):not([type=button]):not([type=submit]), main textarea, main button[role=combobox]"))
        .filter(field => field.getAttribute("aria-hidden") !== "true");
      if (!fields.length) return setProgress(0);
      const complete = fields.filter(field => {
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) return Boolean(field.value.trim());
        return Boolean(field.textContent?.trim() && !/select|choose/i.test(field.textContent));
      }).length;
      setProgress(Math.round(complete / fields.length * 100));
    };
    const timer = window.setTimeout(updateProgress, 250);
    document.addEventListener("input", updateProgress);
    document.addEventListener("change", updateProgress);
    return () => { window.clearTimeout(timer); document.removeEventListener("input", updateProgress); document.removeEventListener("change", updateProgress); };
  }, [location.pathname, isWorkflow]);

  const saveDraft = () => {
    const values = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("main input, main textarea")).reduce<Record<string,string>>((all, field, index) => {
      if (field.type !== "password" && field.type !== "file") all[field.name || field.id || `field-${index}`] = field.value;
      return all;
    }, {});
    localStorage.setItem(`erp-draft:${location.pathname}`, JSON.stringify({ savedAt: new Date().toISOString(), values }));
    toast({ title: "Draft saved", description: `${progress}% complete · stored safely on this device.` });
  };

  if (!group) return null;
  return <div className="sticky top-[68px] z-30 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-[1600px] items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        <span className="mr-2 hidden shrink-0 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground lg:block">{group.title}</span>
        {group.items.map(item => <Link key={item.url} to={item.url} className={cn("shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-all hover:bg-muted", location.pathname === item.url ? "bg-foreground text-background shadow-sm" : "text-muted-foreground")}><item.icon className="mr-1.5 inline h-3.5 w-3.5"/>{item.title}</Link>)}
      </div>
      {isWorkflow && <div className="hidden shrink-0 items-center gap-2 border-l pl-3 sm:flex"><div className="w-24"><div className="mb-1 flex justify-between text-[10px]"><span className="text-muted-foreground">Progress</span><strong>{progress}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#92c500] transition-all duration-500" style={{width:`${progress}%`}}/></div></div><Button variant="ghost" size="sm" onClick={saveDraft}>{progress===100?<Check/>:<Save/>}Save draft</Button></div>}
    </div>
  </div>;
}
