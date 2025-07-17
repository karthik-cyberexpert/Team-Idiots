import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListTodo, Gamepad2 } from "lucide-react";

const AdminDashboard = () => {
  const adminFeatures = [
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions.",
      icon: <Users className="h-8 w-8 text-primary" />,
      link: "/admin/users",
    },
    {
      title: "Task Management",
      description: "Oversee and assign tasks to team members.",
      icon: <ListTodo className="h-8 w-8 text-primary" />,
      link: "/admin/tasks",
    },
    {
      title: "Game Management",
      description: "Add, edit, or remove games available for group play.",
      icon: <Gamepad2 className="h-8 w-8 text-primary" />,
      link: "/admin/games",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        This is the admin dashboard. Here you can manage various aspects of the application.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminFeatures.map((feature) => (
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

export default AdminDashboard;