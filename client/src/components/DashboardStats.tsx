import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Zap, Calendar, TrendingUp } from "lucide-react";

const stats = [
  { title: "Total Decks", value: "12", icon: Layers, change: "+2 this week" },
  { title: "Cards Generated", value: "248", icon: Zap, change: "+34 today" },
  { title: "Study Streak", value: "7 days", icon: Calendar, change: "Keep it up!" },
  { title: "Cards Mastered", value: "186", icon: TrendingUp, change: "+12 today" },
];

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
