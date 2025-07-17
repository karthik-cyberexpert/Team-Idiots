import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const EditProfilePage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Edit Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>This is where you can edit your profile information. This feature is coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProfilePage;