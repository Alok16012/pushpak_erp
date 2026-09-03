import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Users,
  GraduationCap,
  IndianRupee,
  CalendarClock,
  Plus,
  MapPin,
  Phone,
  UserCheck,
  Shield,
  FileText,
  Info,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getBranchesWithStats, updateBranchWithDetails, getBranchDetails, deleteBranch } from "@/lib/supabase/data";
import { printHtml } from "@/lib/export";

/**
 * The register row: the branch columns plus the bits gathered from its
 * address, licence and student/fee counts.
 */
interface Branch {
  id: string;
  name: string;
  code: string;
  branchType: string;
  city: string;
  state: string;
  students: number;
  staff: number;
  revenue: number;
  expiryDate: string;
  status: "active" | "inactive";
}

const columns: Column<Branch>[] = [
  {
    key: "name",
    header: "Branch",
    sortable: true,
    cell: (branch) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{branch.name}</p>
          <p className="text-xs text-muted-foreground">{branch.code}</p>
        </div>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
     cell: (branch) => (
       <div className="space-y-1">
         <Badge variant="outline">{branch.branchType}</Badge>
       </div>
     ),
  },
  {
    key: "city",
    header: "Location",
    cell: (branch) => (
      <span>{[branch.city, branch.state].filter(Boolean).join(", ") || "—"}</span>
    ),
  },
  {
    key: "students",
    header: "Students",
    sortable: true,
    cell: (branch) => <span className="font-medium">{(branch.students ?? 0).toLocaleString()}</span>,
  },
  {
    key: "staff",
    header: "Staff",
    sortable: true,
  },
  {
    key: "revenue",
    header: "Revenue",
    sortable: true,
    cell: (branch) => <span className="font-medium text-success">Rs.{((branch.revenue ?? 0) / 100000).toFixed(1)}L</span>,
  },
  {
     key: "expiryDate",
     header: "Expiry",
     sortable: true,
     cell: (branch) => {
       if (!branch.expiryDate) return <span className="text-muted-foreground">—</span>;
       const expiry = new Date(branch.expiryDate);
       const today = new Date();
       const isExpired = expiry < today;
       const isExpiringSoon = !isExpired && expiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
       return (
         <div className="flex items-center gap-1">
           <CalendarClock className={`h-4 w-4 ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'}`} />
           <span className={isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : ''}>
             {expiry.toLocaleDateString()}
           </span>
         </div>
       );
     },
  },
  {
    key: "status",
    header: "Status",
    cell: (branch) => <StatusBadge status={branch.status} />,
  },
];

interface BranchEdit {
  // branch
  id: string;
  name: string;
  code: string;
  branchType: string;
  instituteType: string;
  academicYear: string;
  establishedYear: number | "";
  website: string;
  description: string;
  phone: string;
  altPhone: string;
  whatsappNumber: string;
  email: string;
  numComputers: number;
  numFaculty: number;
  numRooms: number;
  isActive: boolean;
  onlineEnrollment: boolean;
  smsNotifications: boolean;
  emailNotifications: boolean;
  // address
  streetAddress: string;
  state: string;
  district: string;
  block: string;
  city: string;
  pincode: string;
  latitude: number | "";
  longitude: number | "";
  country: string;
  // director
  directorName: string;
  directorGender: string;
  directorDOB: string;
  directorBloodGroup: string;
  // license
  registrationDate: string;
  validDate: string;
  expiryDate: string;
  referralCode: string;
  // admin
  adminName: string;
  adminEmail: string;
  adminPhone: string;
}

export default function ViewBranch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [branchesData, setBranchesData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Branch | null>(null);
  const [editing, setEditing] = useState<BranchEdit | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const body = await getBranchesWithStats(user?.organizationId || null);
        setBranchesData(body.data as unknown as Branch[]);
      } catch (error) {
        toast({
          title: "Failed to load branches",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [toast, user?.organizationId]);

  // Generate a single branch's certificate HTML content
  const getCertificateHtml = (branch: Branch) => `
    <div style="page-break-after:always;border:6px double #1f2937;padding:48px;text-align:center;font-family:Georgia,serif">
      <p style="letter-spacing:.3em;font-size:12px;text-transform:uppercase;color:#6b7280">Pushpak Institute</p>
      <h1 style="margin:16px 0 4px;font-size:30px">Center Certificate</h1>
      <p style="color:#6b7280;font-size:13px">This is to certify that the centre named below is authorised to operate</p>
      <h2 style="margin:28px 0 4px;font-size:24px">${branch.name}</h2>
      <p style="font-size:14px">Centre code <strong>${branch.code}</strong></p>
      <p style="font-size:14px">${branch.city}, ${branch.state}</p>
      <table style="margin:28px auto 0;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 16px;text-align:right;color:#6b7280">Type</td><td style="padding:4px 16px;text-align:left"><strong>${branch.branchType}</strong></td></tr>
        <tr><td style="padding:4px 16px;text-align:right;color:#6b7280">Status</td><td style="padding:4px 16px;text-align:left"><strong>${branch.status === "active" ? "Active" : "Inactive"}</strong></td></tr>
      </table>
      <p style="margin-top:48px;font-size:12px;color:#6b7280">Issued on ${new Date().toLocaleDateString()}</p>
    </div>
  `;

  // Print certificate for a single branch
  const certificate = (branch: Branch) =>
    printHtml(
      `Center Certificate - ${branch.code}`,
      getCertificateHtml(branch),
    );

  // Bulk download certificates for selected branches
  const bulkCertificates = async (branches: Branch[]) => {
    if (branches.length === 0) {
      toast({ title: "No branches selected", variant: "destructive" });
      return;
    }
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        if (i > 0) pdf.addPage();

        // Header
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text("Pushpak Institute", pageWidth / 2, margin, { align: "center" });

        pdf.setFontSize(26);
        pdf.setTextColor(31, 41, 55);
        pdf.text("Center Certificate", pageWidth / 2, margin + 12, { align: "center" });

        pdf.setFontSize(11);
        pdf.setTextColor(107, 114, 128);
        pdf.text("This is to certify that the centre named below is authorised to operate", pageWidth / 2, margin + 20, { align: "center" });

        // Branch name
        pdf.setFontSize(20);
        pdf.setTextColor(31, 41, 55);
        pdf.text(branch.name, pageWidth / 2, margin + 35, { align: "center" });

        // Details
        pdf.setFontSize(12);
        pdf.setTextColor(55, 65, 81);
        pdf.text(`Centre code ${branch.code}`, pageWidth / 2, margin + 44, { align: "center" });
        pdf.text(`${branch.city}, ${branch.state}`, pageWidth / 2, margin + 51, { align: "center" });

        // Table
        const tableY = margin + 62;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);

        // Type row
        pdf.setTextColor(107, 114, 128);
        pdf.text("Type", pageWidth / 2 - 40, tableY, { align: "right" });
        pdf.setTextColor(31, 41, 55);
        pdf.setFont(undefined, "bold");
        pdf.text(branch.branchType, pageWidth / 2 + 10, tableY, { align: "left" });
        pdf.setFont(undefined, "normal");

        // Status row
        pdf.setTextColor(107, 114, 128);
        pdf.text("Status", pageWidth / 2 - 40, tableY + 8, { align: "right" });
        pdf.setTextColor(31, 41, 55);
        pdf.setFont(undefined, "bold");
        pdf.text(branch.status === "active" ? "Active" : "Inactive", pageWidth / 2 + 10, tableY + 8, { align: "left" });
        pdf.setFont(undefined, "normal");

        // Footer
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Issued on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - margin, { align: "center" });
      }

      pdf.save(`center-certificates-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: `${branches.length} certificate${branches.length > 1 ? "s" : ""} downloaded` });
    } catch {
      toast({ title: "Failed to generate certificates", variant: "destructive" });
    }
  };

  const handleSelectionChange = (ids: (string | number)[]) => {
    setSelectedBranches(branchesData.filter((b) => ids.includes(b.id)));
  };

  const handleActions = (branch: Branch) => [
    { label: "View Details", onClick: () => setDetails(branch) },
    { label: "Edit Branch", onClick: async () => {
      try {
        const full = await getBranchDetails(user?.organizationId || "", branch.id);
        const d = (full.data as Record<string, unknown>);
        const addr = (d.address || {}) as Record<string, unknown>;
        const dir = (d.director || {}) as Record<string, unknown>;
        const lic = (d.license || {}) as Record<string, unknown>;
        setEditing({
          id: d.id as string,
          name: d.name as string,
          code: d.code as string,
          branchType: d.branchType as string,
          instituteType: (d.instituteType as string) || "OTHER",
          academicYear: (d.academicYear as string) || "",
          establishedYear: (d.establishedYear as number) ?? "",
          website: (d.website as string) || "",
          description: (d.description as string) || "",
          phone: (d.phone as string) || "",
          altPhone: (d.altPhone as string) || "",
          whatsappNumber: (d.whatsappNumber as string) || "",
          email: (d.email as string) || "",
          numComputers: (d.numComputers as number) || 0,
          numFaculty: (d.numFaculty as number) || 0,
          numRooms: (d.numRooms as number) || 0,
          isActive: (d.isActive as boolean) ?? true,
          onlineEnrollment: (d.onlineEnrollment as boolean) ?? false,
          smsNotifications: (d.smsNotifications as boolean) ?? false,
          emailNotifications: (d.emailNotifications as boolean) ?? true,
          streetAddress: (addr.streetAddress as string) || "",
          state: (addr.state as string) || "",
          district: (addr.district as string) || "",
          block: (addr.block as string) || "",
          city: (addr.city as string) || "",
          pincode: (addr.pincode as string) || "",
          latitude: (addr.latitude as number) ?? "",
          longitude: (addr.longitude as number) ?? "",
          country: (addr.country as string) || "India",
          directorName: (dir.name as string) || "",
          directorGender: (dir.gender as string) || "",
          directorDOB: dir.dob ? new Date(dir.dob as string).toISOString().split("T")[0] : "",
          directorBloodGroup: (dir.bloodGroup as string) || "",
          registrationDate: lic.registrationDate ? new Date(lic.registrationDate as string).toISOString().split("T")[0] : "",
          validDate: lic.validDate ? new Date(lic.validDate as string).toISOString().split("T")[0] : "",
          expiryDate: lic.expiryDate ? new Date(lic.expiryDate as string).toISOString().split("T")[0] : "",
          referralCode: (lic.referralCode as string) || "",
          adminName: "",
          adminEmail: "",
          adminPhone: "",
        });
        setDetails(null);
      } catch {
        toast({ title: "Failed to load branch details", variant: "destructive" });
      }
    } },
    { label: "Center Certificate", onClick: () => certificate(branch) },
    { label: "Manage Staff", onClick: () => navigate("/user/all") },
    { label: "View Reports", onClick: () => navigate("/attendance/report") },
    { label: "Delete", onClick: () => setPendingDelete(branch), destructive: true },
  ];

  const saveEdit = async () => {
    if (!editing || !user) return;
    if (!editing.name.trim() || !editing.code.trim()) {
      toast({ title: "Name and code are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateBranchWithDetails(editing.id, user.organizationId, {
        branch: {
          name: editing.name,
          code: editing.code,
          branchType: editing.branchType.toUpperCase(),
          instituteType: editing.instituteType.toUpperCase(),
          academicYear: editing.academicYear,
          establishedYear: editing.establishedYear === "" ? null : Number(editing.establishedYear),
          website: editing.website || null,
          description: editing.description || null,
          phone: editing.phone,
          altPhone: editing.altPhone || null,
          whatsappNumber: editing.whatsappNumber || null,
          email: editing.email,
          numComputers: editing.numComputers,
          numFaculty: editing.numFaculty,
          numRooms: editing.numRooms,
          isActive: editing.isActive,
          onlineEnrollment: editing.onlineEnrollment,
          smsNotifications: editing.smsNotifications,
          emailNotifications: editing.emailNotifications,
        },
        address: {
          streetAddress: editing.streetAddress,
          state: editing.state,
          district: editing.district,
          block: editing.block || null,
          city: editing.city,
          pincode: editing.pincode,
          latitude: editing.latitude === "" ? null : Number(editing.latitude),
          longitude: editing.longitude === "" ? null : Number(editing.longitude),
          country: editing.country || "India",
        },
        director: {
          name: editing.directorName,
          gender: editing.directorGender.toUpperCase(),
          dob: editing.directorDOB ? new Date(editing.directorDOB).toISOString() : new Date().toISOString(),
          bloodGroup: editing.directorBloodGroup || null,
        },
        license: editing.expiryDate
          ? {
              registrationDate: new Date(`${editing.registrationDate || editing.expiryDate.slice(0, 7)}-01`).toISOString(),
              validDate: editing.validDate ? new Date(editing.validDate).toISOString() : null,
              expiryDate: new Date(editing.expiryDate).toISOString(),
              referralCode: editing.referralCode || null,
            }
          : undefined,
      });
      setBranchesData((prev) =>
        prev.map((b) =>
          b.id === editing.id
            ? {
                ...b,
                name: editing.name,
                branchType: editing.branchType,
                city: editing.city,
                state: editing.state,
                students: b.students,
                staff: editing.numFaculty,
                expiryDate: editing.expiryDate ? new Date(editing.expiryDate).toISOString() : b.expiryDate,
                status: editing.isActive ? "active" : "inactive",
              }
            : b,
        ),
      );
      toast({ title: "Branch updated", description: `${editing.name} was saved.` });
      setEditing(null);
    } catch (error) {
      toast({
        title: "Failed to update branch",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteBranch(pendingDelete.id);
      setBranchesData((prev) => prev.filter((b) => b.id !== pendingDelete.id));
      toast({ title: "Branch removed", description: `${pendingDelete.name} is no longer in the register.` });
    } catch {
      toast({ title: "Failed to delete branch", variant: "destructive" });
    }
    setPendingDelete(null);
  };

  const totalStudents = branchesData.reduce((sum, b) => sum + (b.students ?? 0), 0);
  const totalStaff = branchesData.reduce((sum, b) => sum + (b.staff ?? 0), 0);
  const totalRevenue = branchesData.reduce((sum, b) => sum + (b.revenue ?? 0), 0);
  const activeBranches = branchesData.filter(b => b.status === "active").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading branches...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="View Branches"
        description="Manage all branches and their details"
        breadcrumbs={[
          { label: "Branch Management", href: "/branch/view" },
          { label: "View Branches" },
        ]}
        actions={
          <Button className="gap-2" onClick={() => navigate("/branch/create")}>
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Total Branches"
          value={branchesData.length}
          subtitle={`${activeBranches} active`}
          icon={Building2}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Total Students"
          value={totalStudents.toLocaleString()}
          subtitle="Across all branches"
          icon={GraduationCap}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Total Staff"
          value={totalStaff}
          subtitle="Teaching & non-teaching"
          icon={Users}
        />
        <StatsCard
          title="Total Revenue"
          value={`Rs.${(totalRevenue / 100000).toFixed(1)}L`}
          subtitle="This month"
          icon={IndianRupee}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <DataTable
        data={branchesData}
        columns={columns}
        searchPlaceholder="Search branches..."
        actions={handleActions}
        selectable
        onSelectionChange={handleSelectionChange}
      />

      {selectedBranches.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 rounded-full border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-5 py-2.5 shadow-lg">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedBranches.length}</span> selected
            </span>
            <Button size="sm" className="gap-2 rounded-full" onClick={() => bulkCertificates(selectedBranches)}>
              Download Certificates
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0" onClick={() => setSelectedBranches([])}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.code}</DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Branch type", details.branchType],
                ["Location", [details.city, details.state].filter(Boolean).join(", ") || "—"],
                ["Students", (details.students ?? 0).toLocaleString()],
                ["Staff", String(details.staff ?? 0)],
                ["Revenue", `Rs.${((details.revenue ?? 0) / 100000).toFixed(1)}L`],
                ["Status", details.status === "active" ? "Active" : "Inactive"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => details && certificate(details)}>Print certificate</Button>
            <Button onClick={async () => {
              if (!details) return;
              try {
                const full = await getBranchDetails(user?.organizationId || "", details.id);
                const d = (full.data as Record<string, unknown>);
                const addr = (d.address || {}) as Record<string, unknown>;
                const dir = (d.director || {}) as Record<string, unknown>;
                const lic = (d.license || {}) as Record<string, unknown>;
                setEditing({
                  id: d.id as string,
                  name: d.name as string,
                  code: d.code as string,
                  branchType: d.branchType as string,
                  instituteType: (d.instituteType as string) || "OTHER",
                  academicYear: (d.academicYear as string) || "",
                  establishedYear: (d.establishedYear as number) ?? "",
                  website: (d.website as string) || "",
                  description: (d.description as string) || "",
                  phone: (d.phone as string) || "",
                  altPhone: (d.altPhone as string) || "",
                  whatsappNumber: (d.whatsappNumber as string) || "",
                  email: (d.email as string) || "",
                  numComputers: (d.numComputers as number) || 0,
                  numFaculty: (d.numFaculty as number) || 0,
                  numRooms: (d.numRooms as number) || 0,
                  isActive: (d.isActive as boolean) ?? true,
                  onlineEnrollment: (d.onlineEnrollment as boolean) ?? false,
                  smsNotifications: (d.smsNotifications as boolean) ?? false,
                  emailNotifications: (d.emailNotifications as boolean) ?? true,
                  streetAddress: (addr.streetAddress as string) || "",
                  state: (addr.state as string) || "",
                  district: (addr.district as string) || "",
                  block: (addr.block as string) || "",
                  city: (addr.city as string) || "",
                  pincode: (addr.pincode as string) || "",
                  latitude: (addr.latitude as number) ?? "",
                  longitude: (addr.longitude as number) ?? "",
                  country: (addr.country as string) || "India",
                  directorName: (dir.name as string) || "",
                  directorGender: (dir.gender as string) || "",
                  directorDOB: dir.dob ? new Date(dir.dob as string).toISOString().split("T")[0] : "",
                  directorBloodGroup: (dir.bloodGroup as string) || "",
                  registrationDate: lic.registrationDate ? new Date(lic.registrationDate as string).toISOString().split("T")[0] : "",
                  validDate: lic.validDate ? new Date(lic.validDate as string).toISOString().split("T")[0] : "",
                  expiryDate: lic.expiryDate ? new Date(lic.expiryDate as string).toISOString().split("T")[0] : "",
                  referralCode: (lic.referralCode as string) || "",
                  adminName: "",
                  adminEmail: "",
                  adminPhone: "",
                });
                setDetails(null);
              } catch {
                toast({ title: "Failed to load branch details", variant: "destructive" });
              }
            }}>Edit branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit branch</DialogTitle>
            <DialogDescription>Update the register entry for {editing?.code}.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Info className="h-4 w-4" /> Basic Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-name">Branch name *</Label>
                    <Input id="edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Branch Code *</Label>
                    <Input id="edit-code" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-branchType">Branch Type</Label>
                    <Select value={editing.branchType} onValueChange={(value) => setEditing({ ...editing, branchType: value })}>
                      <SelectTrigger id="edit-branchType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAIN">Main Branch</SelectItem>
                        <SelectItem value="SUB">Sub Branch</SelectItem>
                        <SelectItem value="FRANCHISE">Franchise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-instituteType">Institute Type</Label>
                    <Select value={editing.instituteType} onValueChange={(value) => setEditing({ ...editing, instituteType: value })}>
                      <SelectTrigger id="edit-instituteType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHOOL">School</SelectItem>
                        <SelectItem value="COLLEGE">College</SelectItem>
                        <SelectItem value="COACHING">Coaching</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-academicYear">Academic Year</Label>
                    <Input id="edit-academicYear" value={editing.academicYear} onChange={(e) => setEditing({ ...editing, academicYear: e.target.value })} placeholder="e.g. 2024-25" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-establishedYear">Established Year</Label>
                    <Input id="edit-establishedYear" type="number" value={editing.establishedYear} onChange={(e) => setEditing({ ...editing, establishedYear: e.target.value === "" ? "" : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-website">Website</Label>
                    <Input id="edit-website" value={editing.website} onChange={(e) => setEditing({ ...editing, website: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea id="edit-description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Contact Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone *</Label>
                    <Input id="edit-phone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-altPhone">Alternate Phone</Label>
                    <Input id="edit-altPhone" value={editing.altPhone} onChange={(e) => setEditing({ ...editing, altPhone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-whatsappNumber">WhatsApp Number</Label>
                    <Input id="edit-whatsappNumber" value={editing.whatsappNumber} onChange={(e) => setEditing({ ...editing, whatsappNumber: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input id="edit-email" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Address
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-streetAddress">Street Address</Label>
                    <Textarea id="edit-streetAddress" value={editing.streetAddress} onChange={(e) => setEditing({ ...editing, streetAddress: e.target.value })} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-country">Country</Label>
                    <Input id="edit-country" value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-state">State</Label>
                    <Input id="edit-state" value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-district">District</Label>
                    <Input id="edit-district" value={editing.district} onChange={(e) => setEditing({ ...editing, district: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-block">Block</Label>
                    <Input id="edit-block" value={editing.block} onChange={(e) => setEditing({ ...editing, block: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">City</Label>
                    <Input id="edit-city" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pincode">Pincode</Label>
                    <Input id="edit-pincode" value={editing.pincode} onChange={(e) => setEditing({ ...editing, pincode: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-latitude">Latitude</Label>
                    <Input id="edit-latitude" type="number" step="any" value={editing.latitude} onChange={(e) => setEditing({ ...editing, latitude: e.target.value === "" ? "" : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-longitude">Longitude</Label>
                    <Input id="edit-longitude" type="number" step="any" value={editing.longitude} onChange={(e) => setEditing({ ...editing, longitude: e.target.value === "" ? "" : Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Infrastructure */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="h-4 w-4" /> Infrastructure
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-numComputers">Computers</Label>
                    <Input id="edit-numComputers" type="number" value={editing.numComputers} onChange={(e) => setEditing({ ...editing, numComputers: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-numFaculty">Faculty</Label>
                    <Input id="edit-numFaculty" type="number" value={editing.numFaculty} onChange={(e) => setEditing({ ...editing, numFaculty: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-numRooms">Rooms</Label>
                    <Input id="edit-numRooms" type="number" value={editing.numRooms} onChange={(e) => setEditing({ ...editing, numRooms: Number(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              {/* Director */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Director Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-directorName">Director Name</Label>
                    <Input id="edit-directorName" value={editing.directorName} onChange={(e) => setEditing({ ...editing, directorName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-directorGender">Gender</Label>
                    <Select value={editing.directorGender} onValueChange={(value) => setEditing({ ...editing, directorGender: value })}>
                      <SelectTrigger id="edit-directorGender"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-directorDOB">Date of Birth</Label>
                    <Input id="edit-directorDOB" type="date" value={editing.directorDOB} onChange={(e) => setEditing({ ...editing, directorDOB: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-directorBloodGroup">Blood Group</Label>
                    <Input id="edit-directorBloodGroup" value={editing.directorBloodGroup} onChange={(e) => setEditing({ ...editing, directorBloodGroup: e.target.value })} placeholder="e.g. A+" />
                  </div>
                </div>
              </div>

              {/* License */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> License / Registration
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-registrationDate">Registration Date</Label>
                    <Input id="edit-registrationDate" type="date" value={editing.registrationDate} onChange={(e) => setEditing({ ...editing, registrationDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-validDate">Valid Date</Label>
                    <Input id="edit-validDate" type="date" value={editing.validDate} onChange={(e) => setEditing({ ...editing, validDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-expiryDate">Expiry Date</Label>
                    <Input id="edit-expiryDate" type="date" value={editing.expiryDate} onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-referralCode">Referral Code</Label>
                    <Input id="edit-referralCode" value={editing.referralCode} onChange={(e) => setEditing({ ...editing, referralCode: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Settings
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="edit-isActive" className="cursor-pointer">Active Status</Label>
                      <p className="text-xs text-muted-foreground">Enable/disable branch</p>
                    </div>
                    <Switch id="edit-isActive" checked={editing.isActive} onCheckedChange={(checked) => setEditing({ ...editing, isActive: checked })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="edit-onlineEnrollment" className="cursor-pointer">Online Enrollment</Label>
                      <p className="text-xs text-muted-foreground">Accept online admissions</p>
                    </div>
                    <Switch id="edit-onlineEnrollment" checked={editing.onlineEnrollment} onCheckedChange={(checked) => setEditing({ ...editing, onlineEnrollment: checked })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="edit-smsNotifications" className="cursor-pointer">SMS Notifications</Label>
                      <p className="text-xs text-muted-foreground">Send SMS alerts</p>
                    </div>
                    <Switch id="edit-smsNotifications" checked={editing.smsNotifications} onCheckedChange={(checked) => setEditing({ ...editing, smsNotifications: checked })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="edit-emailNotifications" className="cursor-pointer">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Send email updates</p>
                    </div>
                    <Switch id="edit-emailNotifications" checked={editing.emailNotifications} onCheckedChange={(checked) => setEditing({ ...editing, emailNotifications: checked })} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              This removes the branch from the register along with its {(pendingDelete?.students ?? 0).toLocaleString()} students
              and {pendingDelete?.staff ?? 0} staff from the totals above.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Keep branch</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
