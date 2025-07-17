import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, ListTodo, Code } from "lucide-react";
import { XpBar } from "@/components/dashboard/XpBar"; // Import XpBar

const UserDashboard = () => {
  const userFeatures = [
    {
      title: "Notes",
      description: "Keep track of your personal notes and documents.",
      icon: <FileText className="h-8 w-8 text-primary" />,
      link: "/dashboard/notes",
    },
    {
      title: "Chat",
      description: "Communicate with your team in real-time channels.",
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      link: "/dashboard/chat",
    },
    {
      title: "Tasks",
      description: "View and manage tasks assigned to you.",
      icon: <ListTodo className="h-8 w-8 text-primary" />,
      link: "/dashboard/tasks",
    },
    {
      title: "Code Space",
      description: "Collaborate on code snippets and documents in real-time.",
      icon: <Code className="h-8 w-8 text-primary" />,
      link: "/dashboard/codespace",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Your Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome to your personal dashboard. Here are your quick links:
      </p>
      <XpBar /> {/* Add the XpBar component here */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userFeatures.map((feature) => (
          <Link to={feature.link} key={feature.title}>
            <Card className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{feature.title}</CardTitle>
                {feature.icon}
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;