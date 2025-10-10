import { Home, Plus, FolderOpen, Settings, Sparkles, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Generate", url: "/generate", icon: Plus },
  { title: "My Decks", url: "/decks", icon: FolderOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/");
  };

  return (
    <Sidebar>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <div className="px-2 py-6 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                FlashGenius
              </span>
            </div>
          </div>
          <SidebarGroupLabel className="mb-2 px-2">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} className="py-3 px-3">
                    <Link href={item.url}>
                      <span data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`} className="flex items-center gap-3 w-full">
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} data-testid="button-logout" className="py-3 px-3">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
