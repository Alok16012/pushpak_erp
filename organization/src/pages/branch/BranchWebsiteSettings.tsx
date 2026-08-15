import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Image, Share2, Upload, Save, Calendar } from "lucide-react";
import { useLocalState } from "@/hooks/use-local-collection";
import { pickImage } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

const DEFAULTS = {
  siteName: "ABC School - Main Campus",
  tagline: "Excellence in Education Since 1990",
  description: "Leading educational institution providing quality education...",
  keywords: "school, education, learning, courses",
  domain: "https://abcschool.edu",
  subdomain: "main",
  ssl: true,
  wwwRedirect: true,
  email: "info@abcschool.edu",
  phone: "+91 98765 43210",
  address: "123 Education Street, Mumbai, Maharashtra 400001",
  onlineAdmissions: true,
  onlineFees: true,
  studentPortal: true,
  parentPortal: false,
  registrationDate: "2024-01-01",
  expiryDate: "2025-01-01",
  renewalDate: "2024-12-25",
  bannerTitle: "Welcome to ABC School",
  bannerSubtitle: "Shaping Tomorrow's Leaders Today",
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
  youtube: "",
  whatsapp: "",
  logo: "",
  favicon: "",
  banner: "",
};

export default function BranchWebsiteSettings() {
  const { toast } = useToast();
  const [form, setForm] = useLocalState("erp-website-settings", DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const upload = async (field: "logo" | "favicon" | "banner", accept: string) => {
    const picked = await pickImage(accept);
    if (picked === "too-large") {
      toast({ title: "File too large", description: "Images must be 5MB or smaller.", variant: "destructive" });
      return;
    }
    if (!picked) return;
    set(field, picked.dataUrl);
    toast({ title: "Image uploaded", description: picked.name });
  };

  const save = () => {
    if (!form.siteName.trim()) {
      toast({ title: "Website name required", description: "Give the site a name before saving.", variant: "destructive" });
      return;
    }
    toast({ title: "Website settings saved", description: `${form.siteName} updated.` });
  };

  /** Uploaded preview, or the dashed drop zone when nothing is set yet. */
  const Dropzone = ({ field, hint, accept }: { field: "logo" | "favicon" | "banner"; hint: string; accept: string }) => (
    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
      {form[field] ? (
        <img src={form[field]} alt={`${field} preview`} className="mx-auto mb-2 max-h-24 object-contain" />
      ) : (
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
      )}
      <p className="text-sm text-muted-foreground mb-2">{hint}</p>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => upload(field, accept)}>
          {form[field] ? "Replace File" : "Choose File"}
        </Button>
        {form[field] && (
          <Button variant="ghost" size="sm" onClick={() => set(field, "")}>Remove</Button>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Website Settings"
        description="Configure your branch website appearance and content"
        breadcrumbs={[
          { label: "Branch Management", href: "/branch/view" },
          { label: "Website Settings" },
        ]}
        actions={
          <Button className="gap-2" onClick={save}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        }
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>

          <TabsTrigger value="media" className="gap-2">
            <Image className="h-4 w-4" />
            Media
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Share2 className="h-4 w-4" />
            Social
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Configure your website's basic details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Website Name</Label>
                  <Input id="siteName" value={form.siteName} onChange={(e) => set("siteName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Meta Description</Label>
                  <Textarea id="description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Meta Keywords</Label>
                  <Input id="keywords" value={form.keywords} onChange={(e) => set("keywords", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Domain & URL Settings</CardTitle>
                <CardDescription>Configure your website URL settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Primary Domain</Label>
                  <Input id="domain" value={form.domain} onChange={(e) => set("domain", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Branch Subdomain</Label>
                  <div className="flex gap-2">
                    <Input id="subdomain" value={form.subdomain} onChange={(e) => set("subdomain", e.target.value)} />
                    <span className="flex items-center text-muted-foreground">.abcschool.edu</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SSL Certificate</Label>
                    <p className="text-xs text-muted-foreground">Enable HTTPS for your website</p>
                  </div>
                  <Switch checked={form.ssl} onCheckedChange={(v) => set("ssl", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>WWW Redirect</Label>
                    <p className="text-xs text-muted-foreground">Redirect www to non-www</p>
                  </div>
                  <Switch checked={form.wwwRedirect} onCheckedChange={(v) => set("wwwRedirect", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Display contact details on your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Features</CardTitle>
                <CardDescription>Enable or disable website features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Online Admissions</Label>
                    <p className="text-xs text-muted-foreground">Allow online admission applications</p>
                  </div>
                  <Switch checked={form.onlineAdmissions} onCheckedChange={(v) => set("onlineAdmissions", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Online Fee Payment</Label>
                    <p className="text-xs text-muted-foreground">Enable online fee collection</p>
                  </div>
                  <Switch checked={form.onlineFees} onCheckedChange={(v) => set("onlineFees", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Student Portal</Label>
                    <p className="text-xs text-muted-foreground">Access to student dashboard</p>
                  </div>
                  <Switch checked={form.studentPortal} onCheckedChange={(v) => set("studentPortal", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Parent Portal</Label>
                    <p className="text-xs text-muted-foreground">Access to parent dashboard</p>
                  </div>
                  <Switch checked={form.parentPortal} onCheckedChange={(v) => set("parentPortal", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>View your registration and validity information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="registrationDate">Registration Date</Label>
                    <div className="relative">
                      <Input id="registrationDate" type="date" value={form.registrationDate} onChange={(e) => set("registrationDate", e.target.value)} />
                      <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <div className="relative">
                      <Input id="expiryDate" type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
                      <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="renewalDate">Renewal Date</Label>
                    <div className="relative">
                      <Input id="renewalDate" type="date" value={form.renewalDate} onChange={(e) => set("renewalDate", e.target.value)} />
                      <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        <TabsContent value="media">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Logo & Favicon</CardTitle>
                <CardDescription>Upload your brand assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Website Logo</Label>
                  <Dropzone field="logo" hint="Upload logo (PNG, SVG)" accept="image/png,image/svg+xml" />
                </div>
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <Dropzone field="favicon" hint="Upload favicon (ICO, PNG)" accept="image/png,image/x-icon" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hero Banner</CardTitle>
                <CardDescription>Configure homepage hero section</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Banner Image</Label>
                  <Dropzone field="banner" hint="Upload banner (1920x600)" accept="image/*" />
                </div>
                <div className="space-y-2">
                  <Label>Banner Title</Label>
                  <Input value={form.bannerTitle} onChange={(e) => set("bannerTitle", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Banner Subtitle</Label>
                  <Input value={form.bannerSubtitle} onChange={(e) => set("bannerSubtitle", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Facebook</Label>
                  <Input placeholder="https://facebook.com/yourpage" value={form.facebook} onChange={(e) => set("facebook", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Twitter / X</Label>
                  <Input placeholder="https://twitter.com/yourhandle" value={form.twitter} onChange={(e) => set("twitter", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input placeholder="https://instagram.com/yourprofile" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input placeholder="https://linkedin.com/company/yourcompany" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>YouTube</Label>
                  <Input placeholder="https://youtube.com/yourchannel" value={form.youtube} onChange={(e) => set("youtube", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input placeholder="+91 98765 43210" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
