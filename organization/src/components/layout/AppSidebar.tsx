import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  MessageSquare,
  BookOpen,
  GraduationCap,
  CreditCard,
  ClipboardList,
  Monitor,
  Video,
  IdCard,
  Award,
  Settings,
  UserPlus,
  Package,
  Wallet,
  Bell,
  Globe,
  School,
  Calendar,
  Clock,
  ListChecks,
  Receipt,
  FileText,
  PenTool,
  LayoutTemplate,
  Printer,
  Play,
  FileCheck,
  FileSpreadsheet,
  Handshake,
  ArrowRightLeft,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Camera,
  FileBarChart,
  History,
  Shield,
  KeyRound,
  UserCog,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { title: string; url: string; icon?: React.ComponentType<{ className?: string }> }[];
}

export const menuItems: MenuItem[] = [
  {
    title: "Reception",
    icon: Users,
    items: [
      { title: "Visitors & Enquiries", url: "/reception/enquiry", icon: UserPlus },
      { title: "Item Movement", url: "/reception/dispatch", icon: Package },
    ],
  },
  {
    title: "Branch Management",
    icon: Building2,
    items: [
      { title: "Create Branch", url: "/branch/create", icon: Building2 },
      { title: "View Branch", url: "/branch/view", icon: Building2 },
      { title: "Wallet Recharge", url: "/branch/wallet", icon: Wallet },
      { title: "Branch Transactions", url: "/branch/transactions", icon: Receipt },
      { title: "Notice Board", url: "/branch/notice-board", icon: Bell },
      { title: "Website Settings", url: "/branch/website-settings", icon: Globe },
    ],
  },
  {
    title: "Enquiry Management",
    icon: MessageSquare,
    items: [
      { title: "Branch Enquiry", url: "/enquiry/branch", icon: MessageSquare },
      { title: "Online Branch Enquiry", url: "/enquiry/online-branch", icon: Globe },
      { title: "Online Student Enquiry", url: "/enquiry/online-student", icon: GraduationCap },
    ],
  },
  {
    title: "Course Management",
    icon: BookOpen,
    items: [
      { title: "Create Course", url: "/course/create", icon: BookOpen },
      { title: "View Course", url: "/course/view", icon: BookOpen },
      { title: "Create Batch", url: "/course/batch/create", icon: School },
      { title: "Batch Timing", url: "/course/batch/timing", icon: Clock },
      { title: "Assign Course to Batch", url: "/course/batch/assign", icon: ListChecks },
    ],
  },
  {
    title: "Student Management",
    icon: GraduationCap,
    items: [
      { title: "Admission Form", url: "/student/admission-form", icon: FileText },
      // { title: "Add Student", url: "/student/add", icon: UserPlus },
      { title: "View Students", url: "/student/view", icon: Users },
      { title: "Online Admission List", url: "/student/online-admissions", icon: Globe },
    ],
  },
  {
    title: "Fee Management",
    icon: CreditCard,
    items: [
      { title: "Fee Types", url: "/fee/types", icon: FileText },
      { title: "Fee Groups", url: "/fee/groups", icon: ListChecks },
      { title: "Fee Allocation", url: "/fee/allocation", icon: Calendar },
      { title: "Fee Collection", url: "/fee/collection", icon: Receipt },
      { title: "Due Fee Collection", url: "/fee/due-collection", icon: CreditCard },
    ],
  },
  {
    title: "Exam & Marks",
    icon: ClipboardList,
    items: [
      { title: "Assessments & Results", url: "/exam/marks-list", icon: FileCheck },
    ],
  },
  {
    title: "Online Exam",
    icon: Monitor,
    items: [
      { title: "Create Exam", url: "/online-exam/create", icon: PenTool },
      { title: "Question Paper Builder", url: "/online-exam/question-paper-builder", icon: FileText },
      { title: "Add Questions", url: "/online-exam/add-questions", icon: ListChecks },
      { title: "Online Exam Marks", url: "/online-exam/marks", icon: FileCheck },
    ],
  },
  {
    title: "Live Class",
    icon: Video,
    items: [
      { title: "View Live Classes", url: "/live-class/view", icon: Play },
      { title: "Live Class Setup", url: "/live-class/setup", icon: Settings },
    ],
  },
  {
    title: "ID & Admit Card",
    icon: IdCard,
    items: [
      { title: "ID Card Template", url: "/cards/id-template", icon: LayoutTemplate },
      { title: "Generate ID Cards", url: "/cards/generate-id", icon: Printer },
      { title: "Admit Card Template", url: "/cards/admit-template", icon: LayoutTemplate },
      { title: "Generate Admit Cards", url: "/cards/generate-admit", icon: Printer },
    ],
  },
  {
    title: "Certificate & Marksheet",
    icon: Award,
    items: [
      { title: "Student Documents", url: "/certificate/generate", icon: Printer },
    ],
  },
  {
    title: "System Settings",
    icon: Settings,
    items: [
      { title: "General Settings", url: "/settings/general", icon: Settings },
      { title: "Payment Gateway", url: "/settings/payment-gateway", icon: CreditCard },
      { title: "Payment QR Code", url: "/settings/payment-qr", icon: FileText },
      { title: "Batch Payment QR", url: "/settings/batch-qr", icon: FileText },
    ],
  },
  {
    title: "Partner Management",
    icon: Handshake,
    items: [
      { title: "Add Partner", url: "/partners/add", icon: UserPlus },
      { title: "All Partners", url: "/partners/all", icon: Users },
      { title: "Partner Transactions", url: "/partners/transactions", icon: ArrowRightLeft },
    ],
  },
  {
    title: "Expense Management",
    icon: PiggyBank,
    items: [
      { title: "Voucher Head", url: "/expense/voucher-head", icon: FileText },
      { title: "All Voucher Heads", url: "/expense/voucher-heads", icon: ListChecks },
      { title: "Deposit Voucher", url: "/expense/deposit-voucher", icon: TrendingUp },
      { title: "Expense Voucher", url: "/expense/expense-voucher", icon: TrendingDown },
    ],
  },
  {
    title: "Attendance Management",
    icon: Camera,
    items: [
      { title: "Mark Attendance", url: "/attendance/mark", icon: Camera },
      { title: "Attendance Report", url: "/attendance/report", icon: FileBarChart },
      { title: "Attendance Logs", url: "/attendance/logs", icon: History },
    ],
  },
  {
    title: "User Management",
    icon: Shield,
    items: [
      { title: "All Users", url: "/user/all", icon: Users },
      { title: "User Roles", url: "/user/roles", icon: UserCog },
      { title: "Access Control", url: "/user/access-control", icon: KeyRound },
    ],
  },
  {
    title: "Session Year",
    icon: Calendar,
    items: [
      { title: "Add Session Year", url: "/session/add", icon: Plus },
      { title: "All Session Years", url: "/session/all", icon: ListChecks },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const currentPath = location.pathname;
    const activeGroup = menuItems.find((item) =>
      item.items.some((subItem) => subItem.url === currentPath)
    );
    return activeGroup ? [activeGroup.title] : [];
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-[68px] items-center gap-3 border-b border-sidebar-border px-4">
        <img src="/idealdigiskills-logo.png" alt="Idealdigiskills" className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5" />
        {!collapsed && <div className="leading-tight"><p className="font-semibold tracking-tight">Idealdigiskills</p><p className="text-[11px] text-sidebar-foreground/50">Education ERP</p></div>}
      </div>
      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-sidebar-foreground/40">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/"
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 transition-colors",
                      isActive("/")
                        ? "bg-[#c7ff2f] text-[#171719] font-semibold"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-sidebar-foreground/40">
            All modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = item.items.some(subItem => isActive(subItem.url));
                const entry = item.items.find(subItem => /view|all|list|report|collection|transactions|enquiry/.test(subItem.url)) || item.items[0];
                const productionReady = ["Reception", "Course Management", "Student Management", "Fee Management", "Attendance Management", "Exam & Marks", "Certificate & Marksheet"].includes(item.title);
                return <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={entry.url} className={cn("flex items-center gap-3 px-4 py-2.5 transition-all", active ? "bg-sidebar-accent text-[#c7ff2f] font-semibold" : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <><span className="min-w-0 flex-1 truncate text-sm">{item.title.replace(" Management", "")}</span>{!productionReady&&<span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-sidebar-foreground/40">Preview</span>}<ChevronRight className="h-3.5 w-3.5 opacity-40"/></>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
