import RecentDecks from "@/components/RecentDecks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Decks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">My Decks</h1>
          <p className="text-muted-foreground mt-1">Manage all your flashcard collections</p>
        </div>
        <Link href="/generate">
          <Button data-testid="button-create-deck">
            <Plus className="w-4 h-4 mr-2" />
            Create Deck
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search decks..."
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      <RecentDecks />
    </div>
  );
}
