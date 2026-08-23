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
import { Plus, Building2, Users, GraduationCap, IndianRupee, CalendarClock } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { printHtml } from "@/lib/export";
import { api } from "@/lib/api";

interface Branch {
  id: string;
  name: string;
  code: string;
  type: string;
  instituteType: string;
  city: string;
  state: string;
  students: number;
  staff: number;
  revenue: number;
  status: "active" | "inactive";
  expiryDate: string;
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
         <Badge variant="outline">{branch.type}</Badge>
         <p className="text-xs text-muted-foreground">{branch.instituteType}</p>
       </div>
     ),
  },
  {
    key: "city",
    header: "Location",
    cell: (branch) => (
      <span>{branch.city}, {branch.state}</span>
    ),
  },
  {
    key: "students",
    header: "Students",
    sortable: true,
    cell: (branch) => <span className="font-medium">{branch.students.toLocaleString()}</span>,
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
    cell: (branch) => <span className="font-medium text-success">Rs.{(branch.revenue / 100000).toFixed(1)}L</span>,
  },
  {
     key: "expiryDate",
     header: "Expiry",
     sortable: true,
     cell: (branch) => {
       const expiry = new Date(branch.expiryDate);
       const today = new Date();
       const isExpired = expiry < today;
       const isExpiringSoon = !isExpired && expiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
       return (
         <div className="flex items-center gap-1">
           <CalendarClock className={`h-4 w-4 ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'}`} />
           <span className={isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : ''}>
             {branch.expiryDate}
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

export default function ViewBranch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [branchesData, setBranchesData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Branch | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await api<{ items: Branch[] }>("/core/branches");
        setBranchesData(data.items);
      } catch {
        toast({ title: "Failed to load branches", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [toast]);

  const certificate = (branch: Branch) =>
    printHtml(
      `Center Certificate - ${branch.code}`,
      `<div style="border:6px double #1f2937;padding:48px;text-align:center;font-family:Georgia,serif">
         <p style="letter-spacing:.3em;font-size:12px;text-transform:uppercase;color:#6b7280">Pushpak Institute</p>
         <h1 style="margin:16px 0 4px;font-size:30px">Center Certificate</h1>
         <p style="color:#6b7280;font-size:13px">This is to certify that the centre named below is authorised to operate</p>
         <h2 style="margin:28px 0 4px;font-size:24px">${branch.name}</h2>
         <p style="font-size:14px">Centre code <strong>${branch.code}</strong> - ${branch.instituteType}</p>
         <p style="font-size:14px">${branch.city}, ${branch.state}</p>
         <table style="margin:28px auto 0;font-size:13px;border-collapse:collapse">
           <tr><td style="padding:4px 16px;text-align:right;color:#6b7280">Category</td><td style="padding:4px 16px;text-align:left"><strong>${branch.type}</strong></td></tr>
           <tr><td style="padding:4px 16px;text-align:right;color:#6b7280">Valid until</td><td style="padding:4px 16px;text-align:left"><strong>${branch.expiryDate}</strong></td></tr>
           <tr><td style="padding:4px 16px;text-align:right;color:#6b7280">Status</td><td style="padding:4px 16px;text-align:left"><strong>${branch.status === "active" ? "Active" : "Inactive"}</strong></td></tr>
         </table>
         <p style="margin-top:48px;font-size:12px;color:#6b7280">Issued on ${new Date().toLocaleDateString()}</p>
       </div>`,
    );

  const handleActions = (branch: Branch) => [
    { label: "View Details", onClick: () => setDetails(branch) },
    { label: "Edit Branch", onClick: () => setEditing(branch) },
    { label: "Center Certificate", onClick: () => certificate(branch) },
    { label: "Manage Staff", onClick: () => navigate("/user/all") },
    { label: "View Reports", onClick: () => navigate("/attendance/report") },
    { label: "Delete", onClick: () => setPendingDelete(branch), destructive: true },
  ];

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.code.trim()) {
      toast({ title: "Name and code are required", variant: "destructive" });
      return;
    }
    try {
      await api(`/core/branches/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(editing),
      });
      setBranchesData((prev) => prev.map((b) => (b.id === editing.id ? editing : b)));
      toast({ title: "Branch updated", description: `${editing.name} was saved.` });
      setEditing(null);
    } catch {
      toast({ title: "Failed to update branch", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/core/branches/${pendingDelete.id}`, { method: "DELETE" });
      setBranchesData((prev) => prev.filter((b) => b.id !== pendingDelete.id));
      toast({ title: "Branch removed", description: `${pendingDelete.name} is no longer in the register.` });
    } catch {
      toast({ title: "Failed to delete branch", variant: "destructive" });
    }
    setPendingDelete(null);
  };

  const totalStudents = branchesData.reduce((sum, b) => sum + b.students, 0);
  const totalStaff = branchesData.reduce((sum, b) => sum + b.staff, 0);
  const totalRevenue = branchesData.reduce((sum, b) => sum + b.revenue, 0);
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
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.code} - {details?.instituteType}</DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Branch type", details.type],
                ["Location", `${details.city}, ${details.state}`],
                ["Students", details.students.toLocaleString()],
                ["Staff", String(details.staff)],
                ["Revenue", `Rs.${(details.revenue / 100000).toFixed(1)}L`],
                ["Expiry", details.expiryDate],
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
            <Button onClick={() => { setEditing(details); setDetails(null); }}>Edit branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit branch</DialogTitle>
            <DialogDescription>Update the register entry for {editing?.code}.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-name">Branch name</Label>
                <Input id="edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State</Label>
                <Input id="edit-state" value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-students">Students</Label>
                <Input id="edit-students" type="number" value={editing.students} onChange={(e) => setEditing({ ...editing, students: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-staff">Staff</Label>
                <Input id="edit-staff" type="number" value={editing.staff} onChange={(e) => setEditing({ ...editing, staff: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expiry">Expiry date</Label>
                <Input id="edit-expiry" type="date" value={editing.expiryDate} onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editing.status} onValueChange={(value: Branch["status"]) => setEditing({ ...editing, status: value })}>
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              This removes the branch from the register along with its {pendingDelete?.students.toLocaleString()} students
              and {pendingDelete?.staff} staff from the totals above.
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
