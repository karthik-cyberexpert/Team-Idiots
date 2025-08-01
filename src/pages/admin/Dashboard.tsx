import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListTodo, Database, Type, Star } from "lucide-react";

const AdminDashboard = () => {
  const adminFeatures = [
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions.",
      icon: <Users className="h-8 w-8 text-vibrant-red" />,
      link: "/admin/users",
    },
    {
      title: "Task Management",
      description: "Oversee and assign tasks to team members.",
      icon: <ListTodo className="h-8 w-8 text-vibrant-green" />,
      link: "/admin/tasks",
    },
    {
      title: "Challenge Management",
      description: "Create and manage challenges for users.",
      icon: <Star className="h-8 w-8 text-vibrant-yellow" />,
      link: "/admin/challenges",
    },
    {
      title: "Data Management",
      description: "Clear chat history, notes, and other non-user data.",
      icon: <Database className="h-8 w-8 text-vibrant-purple" />,
      link: "/admin/data-management",
    },
    {
      title: "Typer Management",
      description: "Manage sample texts and view statistics for the Typer app.",
      icon: <Type className="h-8 w-8 text-vibrant-orange" />,
      link: "/admin/typer-management",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-orange dark:text-vibrant-pink">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-2 text-vibrant-brown dark:text-vibrant-silver">
        This is the admin dashboard. Here you can manage various aspects of the application.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 [perspective:1000px]">
        {adminFeatures.map((feature) => (
          <Link to={feature.link} key={feature.title} className="group">
            <Card className="h-full flex flex-col justify-between transform transition-transform-shadow duration-300 ease-in-out group-hover:scale-[1.02] group-hover:shadow-xl group-hover:rotate-x-1 group-hover:rotate-y-1 shadow-md">
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

export default AdminDashboard;