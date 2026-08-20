import { useState } from "react";
import { CalendarPlus, Copy, PlayCircle, Video } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalCollection, useLocalState } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import {
  CLASS_SEED, PORTAL_KEYS, PROFILE_SEED, classState,
  type PortalClass, type StudentProfile,
} from "@/data/student-portal";

const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** One calendar entry the student can drop into any calendar app. */
function downloadIcs(item: PortalClass) {
  const start = new Date(item.startsAt);
  const end = new Date(start.getTime() + item.minutes * 60_000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Idealdigiskills//Student Portal//EN", "BEGIN:VEVENT",
    `UID:${item.id}@idealdigiskills`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${item.subject} — ${item.topic}`,
    `DESCRIPTION:${item.faculty} · ${item.platform}\\nJoin: ${item.link}`,
    `URL:${item.link}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${item.subject.toLowerCase().replace(/\W+/g, "-")}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function MyClasses() {
  const { toast } = useToast();
  const [profile] = useLocalState<StudentProfile>(PORTAL_KEYS.profile, PROFILE_SEED);
  const { items: classes } = useLocalCollection<PortalClass>(PORTAL_KEYS.classes, CLASS_SEED);
  const [tab, setTab] = useState("upcoming");

  const sorted = [...classes].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const rows = tab === "completed"
    ? sorted.filter((item) => classState(item) === "completed").reverse()
    : sorted.filter((item) => classState(item) !== "completed");

  const join = (item: PortalClass) => {
    window.open(item.link, "_blank", "noopener");
    toast({ title: `Joining ${item.subject}`, description: `${item.platform} opened in a new tab.` });
  };
  const copy = async (item: PortalClass) => {
    try {
      await navigator.clipboard.writeText(item.link);
      toast({ title: "Link copied", description: item.link });
    } catch {
      toast({ title: "Could not copy", description: item.link, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Live classes"
        description={`Scheduled sessions for ${profile.batch} — join, save to your calendar, or replay a recording.`}
        breadcrumbs={[{ label: "Live classes" }]}
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="upcoming">Live & upcoming ({sorted.filter((item) => classState(item) !== "completed").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({sorted.filter((item) => classState(item) === "completed").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((item) => {
          const state = classState(item);
          return (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{item.subject}</h3>
                      {state === "live" && <Badge className="bg-destructive text-destructive-foreground">Live now</Badge>}
                      {state === "completed" && <Badge variant="outline">Completed</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.topic}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{when(item.startsAt)} · {item.minutes} min · {item.faculty} · {item.platform}</p>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Video className="h-4 w-4" /></span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {state === "completed"
                    ? item.recording
                      ? <Button size="sm" variant="outline" onClick={() => { window.open(item.recording, "_blank", "noopener"); toast({ title: "Opening recording", description: item.subject }); }}><PlayCircle className="mr-1.5 h-3.5 w-3.5" />Watch recording</Button>
                      : <span className="text-xs text-muted-foreground">No recording was published for this session.</span>
                    : <>
                        <Button size="sm" variant={state === "live" ? "default" : "outline"} onClick={() => join(item)}>Join class</Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadIcs(item)}><CalendarPlus className="mr-1.5 h-3.5 w-3.5" />Add to calendar</Button>
                        <Button size="sm" variant="ghost" onClick={() => copy(item)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy link</Button>
                      </>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!rows.length && <Card className="lg:col-span-2"><CardContent className="py-12 text-center text-sm text-muted-foreground">Nothing here yet.</CardContent></Card>}
      </div>
    </AppLayout>
  );
}
