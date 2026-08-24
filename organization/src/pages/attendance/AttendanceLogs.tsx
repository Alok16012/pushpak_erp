import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Download, Filter, Calendar, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { downloadCsv } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentAttendance } from "@/lib/supabase/data";

interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  punchInTime: string;
  punchOutTime: string;
  punchInPhoto: string;
  punchOutPhoto: string;
  lateArrival: boolean;
  earlyDeparture: boolean;
  overtime: number;
  remarks: string;
}

/** Sample data — dated relative to today so the default 7-day filter shows rows. */
const day = (ago: number) => format(subDays(new Date(), ago), "yyyy-MM-dd");

const sampleAttendanceLogs: AttendanceLog[] = [
  {
    id: "1",
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "IT",
    date: day(0),
    punchInTime: `${day(0)} 09:00:00`,
    punchOutTime: `${day(0)} 18:00:00`,
    punchInPhoto: "/photos/punch-in-1.jpg",
    punchOutPhoto: "/photos/punch-out-1.jpg",
    lateArrival: false,
    earlyDeparture: false,
    overtime: 0,
    remarks: "On time",
  },
  {
    id: "2",
    employeeId: "EMP002",
    employeeName: "Sarah Smith",
    department: "HR",
    date: day(0),
    punchInTime: `${day(0)} 09:45:00`,
    punchOutTime: `${day(0)} 18:30:00`,
    punchInPhoto: "/photos/punch-in-2.jpg",
    punchOutPhoto: "/photos/punch-out-2.jpg",
    lateArrival: true,
    earlyDeparture: false,
    overtime: 0.5,
    remarks: "Late arrival by 45 minutes",
  },
  {
    id: "3",
    employeeId: "EMP003",
    employeeName: "Mike Johnson",
    department: "Sales",
    date: day(1),
    punchInTime: `${day(1)} 08:30:00`,
    punchOutTime: `${day(1)} 20:00:00`,
    punchInPhoto: "/photos/punch-in-3.jpg",
    punchOutPhoto: "/photos/punch-out-3.jpg",
    lateArrival: false,
    earlyDeparture: false,
    overtime: 2,
    remarks: "Overtime work approved",
  },
  {
    id: "4",
    employeeId: "EMP004",
    employeeName: "Emily Davis",
    department: "IT",
    date: day(1),
    punchInTime: `${day(1)} 09:00:00`,
    punchOutTime: `${day(1)} 17:00:00`,
    punchInPhoto: "/photos/punch-in-4.jpg",
    punchOutPhoto: "/photos/punch-out-4.jpg",
    lateArrival: false,
    earlyDeparture: true,
    overtime: 0,
    remarks: "Early departure approved",
  },
  {
    id: "5",
    employeeId: "EMP005",
    employeeName: "Priya Nair",
    department: "Finance",
    date: day(3),
    punchInTime: `${day(3)} 10:10:00`,
    punchOutTime: `${day(3)} 16:40:00`,
    punchInPhoto: "/photos/punch-in-5.jpg",
    punchOutPhoto: "/photos/punch-out-5.jpg",
    lateArrival: true,
    earlyDeparture: true,
    overtime: 0,
    remarks: "Half day - medical appointment",
  },
];

/** The logs are historic, so the default window has to reach back to cover them. */
const defaultRange = () => ({
  from: format(subDays(new Date(), 7), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

type Detail = { log: AttendanceLog; mode: "in" | "out" | "full" };

const AttendanceLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [dateRange, setDateRange] = useState(defaultRange);
  const [detail, setDetail] = useState<Detail | null>(null);

  const filteredLogs = sampleAttendanceLogs.filter((log) => {
    const matchesSearch =
      log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment =
      selectedDepartment === "all" || log.department === selectedDepartment;
    
    const logDate = new Date(log.date);
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);
    
    const matchesDate = logDate >= fromDate && logDate <= toDate;
    
    return matchesSearch && matchesDepartment && matchesDate;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("all");
    setDateRange(defaultRange());
  };

  const exportLogs = () => {
    if (!filteredLogs.length) {
      toast({ title: "Nothing to export", description: "No records match the current filters.", variant: "destructive" });
      return;
    }
    // Export exactly what the table shows, so the file matches the filters.
    downloadCsv(
      `attendance-logs-${dateRange.from}-to-${dateRange.to}.csv`,
      filteredLogs.map((log) => ({
        employeeId: log.employeeId,
        employeeName: log.employeeName,
        department: log.department,
        date: log.date,
        punchIn: log.punchInTime,
        punchOut: log.punchOutTime,
        lateArrival: log.lateArrival ? "Yes" : "No",
        earlyDeparture: log.earlyDeparture ? "Yes" : "No",
        overtimeHours: log.overtime,
        remarks: log.remarks,
      })),
    );
    toast({ title: "Export ready", description: `${filteredLogs.length} record(s) downloaded as CSV.` });
  };

  const columns = [
    {
      key: "employeeId" as keyof AttendanceLog,
      header: "Employee ID",
    },
    {
      key: "employeeName" as keyof AttendanceLog,
      header: "Employee Name",
      cell: (item: AttendanceLog) => (
        <div className="font-medium">{item.employeeName}</div>
      ),
    },
    {
      key: "department" as keyof AttendanceLog,
      header: "Department",
    },
    {
      key: "date" as keyof AttendanceLog,
      header: "Date",
      cell: (item: AttendanceLog) => format(new Date(item.date), "dd MMM yyyy"),
    },
    {
      key: "punchInTime" as keyof AttendanceLog,
      header: "Punch In",
      cell: (item: AttendanceLog) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(item.punchInTime), "hh:mm a")}</span>
          {item.lateArrival && (
            <Badge variant="destructive" className="text-xs">Late</Badge>
          )}
        </div>
      ),
    },
    {
      key: "punchOutTime" as keyof AttendanceLog,
      header: "Punch Out",
      cell: (item: AttendanceLog) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(item.punchOutTime), "hh:mm a")}</span>
          {item.earlyDeparture && (
            <Badge variant="secondary" className="text-xs">Early</Badge>
          )}
        </div>
      ),
    },
    {
      key: "overtime" as keyof AttendanceLog,
      header: "Overtime",
      cell: (item: AttendanceLog) => (
        <span className={item.overtime > 0 ? "text-green-600 font-semibold" : "text-muted-foreground"}>
          {item.overtime > 0 ? `+${item.overtime} hrs` : "-"}
        </span>
      ),
    },
    {
      key: "remarks" as keyof AttendanceLog,
      header: "Remarks",
      cell: (item: AttendanceLog) => (
        <span className="text-sm text-muted-foreground max-w-[200px] truncate">
          {item.remarks || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (item: AttendanceLog) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>View Details</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDetail({ log: item, mode: "in" })}>
              View Punch In Photo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDetail({ log: item, mode: "out" })}>
              View Punch Out Photo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDetail({ log: item, mode: "full" })}>
              View Full Log Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <PageHeader
          title="Attendance Logs"
          description="View detailed attendance logs and history"
          breadcrumbs={[
            { label: "Attendance", href: "/attendance/logs" },
            { label: "Attendance Logs" },
          ]}
          actions={
            <Button variant="outline" onClick={exportLogs}>
              <Download className="mr-2 h-4 w-4" />
              Export Logs
            </Button>
          }
        />

        {/* Filters */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Attendance Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="search">Search Employee</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="dateRange">Date Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="dateRange"
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {sampleAttendanceLogs.length} records
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <Calendar className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Detailed Attendance Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredLogs}
              searchable={false}
              emptyMessage="No attendance logs found for the selected criteria"
            />
          </CardContent>
        </Card>

        <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
          <DialogContent className="max-w-lg">
            {detail && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {detail.mode === "full"
                      ? "Attendance Log Details"
                      : `Punch ${detail.mode === "in" ? "In" : "Out"} Photo`}
                  </DialogTitle>
                  <DialogDescription>
                    {detail.log.employeeName} ({detail.log.employeeId}) •{" "}
                    {format(new Date(detail.log.date), "dd MMM yyyy")}
                  </DialogDescription>
                </DialogHeader>

                {detail.mode === "full" ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {[
                      ["Department", detail.log.department],
                      ["Punch In", format(new Date(detail.log.punchInTime), "dd MMM yyyy, hh:mm a")],
                      ["Punch Out", format(new Date(detail.log.punchOutTime), "dd MMM yyyy, hh:mm a")],
                      ["Late Arrival", detail.log.lateArrival ? "Yes" : "No"],
                      ["Early Departure", detail.log.earlyDeparture ? "Yes" : "No"],
                      ["Overtime", detail.log.overtime > 0 ? `${detail.log.overtime} hrs` : "None"],
                      ["Remarks", detail.log.remarks || "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="contents">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="rounded-lg border bg-muted/40 p-4 text-center">
                    <img
                      src={detail.mode === "in" ? detail.log.punchInPhoto : detail.log.punchOutPhoto}
                      alt={`Punch ${detail.mode} capture`}
                      className="mx-auto max-h-72 rounded object-contain"
                      // Fall back to a readable message instead of a broken image
                      // if the photo was never uploaded.
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                    <p className="hidden text-sm text-muted-foreground">
                      Capture not available for this punch.
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {format(
                        new Date(detail.mode === "in" ? detail.log.punchInTime : detail.log.punchOutTime),
                        "dd MMM yyyy, hh:mm a",
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AttendanceLogs;
