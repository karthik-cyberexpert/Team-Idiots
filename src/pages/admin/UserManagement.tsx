import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const UserManagement = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>
            Here you can add, edit, and remove users from your team. This feature is coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>User list and management tools will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;