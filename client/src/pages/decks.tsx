import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Youtube, Type, MoreVertical, Edit, Trash, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Decks() {
  const { userId } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: decks, isLoading } = useQuery({
    queryKey: ['/api/decks/user', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await apiRequest("GET", `/api/decks/user/${userId}`);
      return await res.json();
    },
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (deckId: string) => {
      await apiRequest("DELETE", `/api/decks/${deckId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decks/user', userId] });
      toast({
        title: "Deck deleted",
        description: "Your deck has been successfully deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete deck",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "document": return FileText;
      case "youtube": return Youtube;
      case "text": return Type;
      default: return FileText;
    }
  };

  const filteredDecks = decks?.filter((deck: any) =>
    deck.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredDecks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No decks match your search" : "No decks yet. Create your first flashcard deck!"}
          </p>
          {!searchQuery && (
            <Link href="/generate">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Deck
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDecks.map((deck: any) => {
            const SourceIcon = getSourceIcon(deck.sourceType);
            return (
              <Card key={deck.id} className="hover-elevate transition-all duration-200">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-display truncate">{deck.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2 flex-wrap">
                      <SourceIcon className="w-3 h-3" />
                      <span>{deck.sourceType}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">{deck.cardType}</Badge>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-menu-${deck.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/editor/${deck.id}`}>
                          <a className="flex items-center">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </a>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(deck.id)}
                        className="text-destructive"
                        data-testid={`menu-delete-${deck.id}`}
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex items-center gap-4 pt-0">
                  <Link href={`/editor/${deck.id}`}>
                    <Button variant="default" size="sm" data-testid={`button-study-${deck.id}`}>
                      Study Now
                    </Button>
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    Created {new Date(deck.createdAt).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
