import DashboardStats from "@/components/DashboardStats";
import RecentDecks from "@/components/RecentDecks";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your learning progress</p>
        </div>
        <Link href="/generate">
          <Button data-testid="button-new-deck">
            <Plus className="w-4 h-4 mr-2" />
            New Deck
          </Button>
        </Link>
      </div>

      <DashboardStats />

      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Recent Decks</h2>
        <RecentDecks />
      </div>
    </div>
  );
}
