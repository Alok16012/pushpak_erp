import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Save, RotateCcw, Video, Settings, Users, Bell, Link2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import {
  BATCHES,
  BATCH_SIZE,
  COURSES,
  DURATIONS,
  INSTRUCTORS,
  LIVE_CLASSES_KEY,
  LIVE_CLASS_SEED,
  PLATFORMS,
  SUBJECTS,
  generateMeetingLink,
  type LiveClass,
} from "@/data/live-classes";

const BLANK = {
  title: "",
  subject: "",
  course: "",
  batch: "",
  instructor: "",
  description: "",
  date: "",
  time: "",
  duration: "60",
  platform: "",
  meetingLink: "",
  meetingId: "",
  password: "",
  waitingRoom: false,
  muteOnEntry: true,
  screenShare: false,
  recording: true,
  chat: true,
  emailNotify: true,
  smsNotify: false,
  pushNotify: true,
  reminder: "30",
  recurring: false,
  repeat: "weekly",
};

const REQUIRED: Array<[keyof typeof BLANK, string]> = [
  ["title", "Class Title"],
  ["subject", "Subject"],
  ["course", "Course"],
  ["batch", "Batch"],
  ["instructor", "Instructor"],
  ["date", "Date"],
  ["time", "Start Time"],
  ["duration", "Duration"],
  ["platform", "Platform"],
];

/** "14:30" → "2:30 PM", the format the class list renders. */
const to12Hour = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

export default function LiveClassSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { add } = useLocalCollection<LiveClass>(LIVE_CLASSES_KEY, LIVE_CLASS_SEED);
  const [form, setForm] = useState(BLANK);

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const fillLink = () => {
    if (!form.platform) {
      toast({ title: "Pick a platform first", variant: "destructive" });
      return;
    }
    const link = generateMeetingLink(form.platform);
    setForm((current) => ({
      ...current,
      meetingLink: link,
      meetingId: link.split("/").pop() ?? current.meetingId,
    }));
    toast({ title: "Meeting link generated", description: link });
  };

  const schedule = () => {
    const missing = REQUIRED.filter(([key]) => !String(form[key]).trim()).map(([, label]) => label);
    if (missing.length) {
      toast({ title: "Fill the required fields", description: missing.join(", "), variant: "destructive" });
      return;
    }
    const startsAt = new Date(`${form.date}T${form.time}`);
    if (startsAt.getTime() < Date.now()) {
      toast({
        title: "That start time is in the past",
        description: "Pick a date and time in the future.",
        variant: "destructive",
      });
      return;
    }

    const duration = DURATIONS.find((option) => option.value === form.duration)?.label ?? "1 hour";
    const link = form.meetingLink.trim() || generateMeetingLink(form.platform);
    add({
      title: form.title.trim(),
      subject: form.subject,
      instructor: form.instructor,
      course: form.course,
      batch: form.batch,
      date: form.date,
      time: to12Hour(form.time),
      duration,
      platform: form.platform,
      meetingLink: link,
      meetingId: form.meetingId.trim() || undefined,
      description: form.description.trim() || undefined,
      attendees: 0,
      totalStudents: BATCH_SIZE[form.batch] ?? 30,
      status: "scheduled",
      recorded: form.recording,
    });

    const channels = [form.emailNotify && "email", form.smsNotify && "SMS", form.pushNotify && "push"]
      .filter(Boolean)
      .join(", ");
    toast({
      title: "Class scheduled",
      description: channels
        ? `${form.title.trim()} · invites going out by ${channels}.`
        : `${form.title.trim()} was added to the schedule.`,
    });
    navigate("/live-class/view");
  };

  const reset = () => {
    setForm(BLANK);
    toast({ title: "Form reset", description: "All fields are back to their defaults." });
  };

  const participantSettings: Array<[keyof typeof BLANK, string, string]> = [
    ["waitingRoom", "Waiting Room", "Admit participants manually"],
    ["muteOnEntry", "Mute on Entry", "Mute participants when they join"],
    ["screenShare", "Allow Screen Sharing", "Participants can share their screen"],
    ["recording", "Enable Recording", "Record the session automatically"],
    ["chat", "Enable Chat", "Allow participants to chat"],
  ];

  const notifications: Array<[keyof typeof BLANK, string]> = [
    ["emailNotify", "Send email invitation"],
    ["smsNotify", "Send SMS reminder"],
    ["pushNotify", "Push notification"],
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Live Class Setup"
        description="Schedule and configure a new live class session"
        breadcrumbs={[
          { label: "Live Class", href: "/live-class/view" },
          { label: "Setup" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Class Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Class Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Algorithms"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={form.subject} onValueChange={(value) => set("subject", value)}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select value={form.course} onValueChange={(value) => set("course", value)}>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSES.map((course) => <SelectItem key={course} value={course}>{course}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch *</Label>
                  <Select value={form.batch} onValueChange={(value) => set("batch", value)}>
                    <SelectTrigger id="batch">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BATCHES.map((batch) => (
                        <SelectItem key={batch} value={batch}>{batch} · {BATCH_SIZE[batch]} students</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructor">Instructor *</Label>
                <Select value={form.instructor} onValueChange={(value) => set("instructor", value)}>
                  <SelectTrigger id="instructor">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUCTORS.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Class Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter class description and agenda..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Schedule & Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input id="date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Start Time *</Label>
                  <Input id="time" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration *</Label>
                  <Select value={form.duration} onValueChange={(value) => set("duration", value)}>
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform *</Label>
                  <Select value={form.platform} onValueChange={(value) => set("platform", value)}>
                    <SelectTrigger id="platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingLink">Meeting Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="meetingLink"
                      placeholder="Auto-generated or paste custom link"
                      value={form.meetingLink}
                      onChange={(e) => set("meetingLink", e.target.value)}
                    />
                    <Button type="button" variant="outline" size="icon" title="Generate link" onClick={fillLink}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meetingId">Meeting ID</Label>
                  <Input id="meetingId" placeholder="Optional" value={form.meetingId} onChange={(e) => set("meetingId", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Meeting Password</Label>
                  <Input id="password" type="password" placeholder="Optional" value={form.password} onChange={(e) => set("password", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participant Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {participantSettings.map(([key, label, hint]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key}>{label}</Label>
                    <p className="text-sm text-muted-foreground">{hint}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={Boolean(form[key])}
                    onCheckedChange={(checked) => set(key, checked as (typeof BLANK)[typeof key])}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={Boolean(form[key])}
                    onCheckedChange={(checked) => set(key, (checked === true) as (typeof BLANK)[typeof key])}
                  />
                  <Label htmlFor={key} className="font-normal">{label}</Label>
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="reminder">Reminder Before</Label>
                <Select value={form.reminder} onValueChange={(value) => set("reminder", value)}>
                  <SelectTrigger id="reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="1440">1 day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recurring Class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring">Make Recurring</Label>
                <Switch id="recurring" checked={form.recurring} onCheckedChange={(checked) => set("recurring", checked)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeat">Repeat</Label>
                <Select
                  value={form.repeat}
                  onValueChange={(value) => set("repeat", value)}
                  disabled={!form.recurring}
                >
                  <SelectTrigger id="repeat">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" onClick={schedule}>
                <Save className="h-4 w-4" />
                Schedule Class
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reset Form
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
