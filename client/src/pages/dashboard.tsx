import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, Zap, Coins, FileText, Youtube, Type, MoreVertical, Edit, Trash, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { userId } = useUser();
  const { toast } = useToast();

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

  // Filter out subdecks, only show parent decks on dashboard
  const parentDecks = decks?.filter((deck: any) => !deck.parentDeckId) || [];
  
  const totalCards = decks?.reduce((sum: number, deck: any) => sum + (deck.cardCount || 0), 0) || 0;
  // Credits logic will be implemented later
  const creditsRemaining = 1000;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your learning progress</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.div 
            className="flex items-center gap-3 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 px-6 py-3 rounded-xl"
            whileHover={{ scale: 1.02 }}
          >
            <Coins className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Credits Remaining</p>
              <p className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {creditsRemaining.toLocaleString()}
              </p>
            </div>
          </motion.div>
          <Link href="/generate">
            <Button data-testid="button-new-deck" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
              <Plus className="w-4 h-4 mr-2" />
              New Deck
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Decks
              </CardTitle>
              <Layers className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {parentDecks.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Active collections</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cards
              </CardTitle>
              <Zap className="w-5 h-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {totalCards}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Generated with AI</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Recent Decks</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : parentDecks.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-to-br from-card to-card/80 border-primary/20">
            <p className="text-muted-foreground mb-4">No decks yet. Create your first flashcard deck!</p>
            <Link href="/generate">
              <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Deck
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {parentDecks.map((deck: any, index: number) => {
              const SourceIcon = getSourceIcon(deck.sourceType);
              return (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="hover-elevate transition-all duration-200 bg-gradient-to-br from-card to-card/80 border-primary/20">
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
                        <Button variant="default" size="sm" data-testid={`button-study-${deck.id}`} className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                          Study Now
                        </Button>
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        Created {new Date(deck.createdAt).toLocaleDateString()}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
