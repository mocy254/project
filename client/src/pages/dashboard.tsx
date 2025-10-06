import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, Zap, Calendar, TrendingUp, FileText, Youtube, Type, MoreVertical, Edit, Trash, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { userId } = useUser();
  const { toast } = useToast();

  const { data: decks, isLoading } = useQuery({
    queryKey: ['/api/decks/user', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await apiRequest(`/api/decks/user/${userId}`, "GET");
      return res as unknown as any[];
    },
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (deckId: string) => {
      await apiRequest(`/api/decks/${deckId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decks/user', userId] });
      toast({
        title: "Deck deleted",
        description: "Your deck has been successfully deleted",
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

  const totalCards = decks?.reduce((sum: number, deck: any) => sum + (deck.cardCount || 0), 0) || 0;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Decks
            </CardTitle>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{decks?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cards
            </CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{totalCards}</div>
            <p className="text-xs text-muted-foreground mt-1">Generated with AI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Study Streak
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">0 days</div>
            <p className="text-xs text-muted-foreground mt-1">Start studying!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cards Mastered
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Keep learning!</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Recent Decks</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !decks || decks.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No decks yet. Create your first flashcard deck!</p>
            <Link href="/generate">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Deck
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {decks.map((deck: any) => {
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
    </div>
  );
}
