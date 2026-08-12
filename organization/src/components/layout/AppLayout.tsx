import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { WorkspaceBar } from "./WorkspaceBar";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { demo } = useAuth();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          {demo && <p className="bg-[#c7ff2f] px-4 py-1.5 text-center text-xs font-medium text-black">Demo mode — sample data for preview only. Changes are not saved.</p>}
          <AppHeader />
          <WorkspaceBar />
          <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8 animate-fade-in">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
