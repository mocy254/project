import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Youtube, Type, MoreVertical, Edit, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

const decks = [
  {
    id: "1",
    title: "Biology Chapter 5: Cell Structure",
    cardCount: 24,
    source: "PDF Document",
    sourceIcon: FileText,
    lastStudied: "2 hours ago",
    cardType: "Q&A"
  },
  {
    id: "2",
    title: "JavaScript ES6 Features",
    cardCount: 18,
    source: "YouTube Video",
    sourceIcon: Youtube,
    lastStudied: "Yesterday",
    cardType: "Cloze"
  },
  {
    id: "3",
    title: "World War II Timeline",
    cardCount: 32,
    source: "Text Input",
    sourceIcon: Type,
    lastStudied: "3 days ago",
    cardType: "Reverse"
  }
];

export default function RecentDecks() {
  return (
    <div className="space-y-4">
      {decks.map((deck) => (
        <Card key={deck.id} className="hover-elevate transition-all duration-200">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-display truncate">{deck.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2 flex-wrap">
                <deck.sourceIcon className="w-3 h-3" />
                <span>{deck.source}</span>
                <span>•</span>
                <span>{deck.cardCount} cards</span>
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
                <DropdownMenuItem data-testid={`menu-edit-${deck.id}`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem data-testid={`menu-delete-${deck.id}`} className="text-destructive">
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
            <span className="text-sm text-muted-foreground">Last studied {deck.lastStudied}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
