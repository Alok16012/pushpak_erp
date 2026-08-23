import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { WorkspaceBar } from "./WorkspaceBar";
import { useAuth } from "@/contexts/AuthContext";
import { MobileNav } from "./MobileNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <WorkspaceBar />
          <main className="min-w-0 flex-1 overflow-x-hidden px-3 pb-24 pt-4 sm:px-6 sm:py-5 md:pb-5 lg:px-8 animate-fade-in">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
