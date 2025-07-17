import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>This is where you can manage your application settings. This feature is coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;