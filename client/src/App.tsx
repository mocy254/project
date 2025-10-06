import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Generate from "@/pages/generate";
import Editor from "@/pages/editor";
import Settings from "@/pages/settings";
import Decks from "@/pages/decks";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container max-w-7xl mx-auto p-6 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const isAppRoute = ["/dashboard", "/generate", "/editor", "/settings", "/decks"].some(
    route => location.startsWith(route)
  );

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/dashboard">
        {isAppRoute ? (
          <AppLayout>
            <Dashboard />
          </AppLayout>
        ) : (
          <Dashboard />
        )}
      </Route>
      <Route path="/generate">
        {isAppRoute ? (
          <AppLayout>
            <Generate />
          </AppLayout>
        ) : (
          <Generate />
        )}
      </Route>
      <Route path="/editor/:id?">
        {isAppRoute ? (
          <AppLayout>
            <Editor />
          </AppLayout>
        ) : (
          <Editor />
        )}
      </Route>
      <Route path="/settings">
        {isAppRoute ? (
          <AppLayout>
            <Settings />
          </AppLayout>
        ) : (
          <Settings />
        )}
      </Route>
      <Route path="/decks">
        {isAppRoute ? (
          <AppLayout>
            <Decks />
          </AppLayout>
        ) : (
          <Decks />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
