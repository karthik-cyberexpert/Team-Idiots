import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
});

const passwordFormSchema = z.object({
  oldPassword: z.string().min(1, { message: "Old password is required." }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const emailFormSchema = z.object({
  newEmail: z.string().email({ message: "Please enter a valid email." }),
});

const EditProfilePage = () => {
  const { user, profile, loading } = useAuth();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: '' },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { newEmail: '' },
  });

  React.useEffect(() => {
    if (profile) {
      profileForm.reset({ fullName: profile.full_name });
    }
  }, [profile, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileFormSchema>) => {
      if (!user) throw new Error("User not found");
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: values.fullName } });
      if (authError) throw authError;
      const { error: profileError } = await supabase.from('profiles').update({ full_name: values.fullName }).eq('id', user.id);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      showSuccess("Profile updated successfully!");
    },
    onError: (err: Error) => showError(err.message),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (values: z.infer<typeof passwordFormSchema>) => {
      const { error } = await supabase.functions.invoke("update-password", {
        body: { oldPassword: values.oldPassword, newPassword: values.newPassword },
      });
      if (error) {
        // The edge function might return a specific error message
        const errorBody = await error.context.json();
        throw new Error(errorBody.error || error.message);
      }
    },
    onSuccess: () => {
      showSuccess("Password updated successfully!");
      passwordForm.reset();
    },
    onError: (err: Error) => showError(err.message),
  });

  const updateEmailMutation = useMutation({
    mutationFn: async (values: z.infer<typeof emailFormSchema>) => {
      const { error } = await supabase.auth.updateUser({ email: values.newEmail });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Confirmation links sent to both your old and new email addresses.");
      emailForm.reset();
    },
    onError: (err: Error) => showError(err.message),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Edit Profile</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your full name here.</CardDescription>
        </CardHeader>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))}>
            <CardContent>
              <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Enter your old password and a new password for your account.</CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit((v) => updatePasswordMutation.mutate(v))}>
            <CardContent className="space-y-4">
              <FormField control={passwordForm.control} name="oldPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Old Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={updatePasswordMutation.isPending}>
                {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Email Address</CardTitle>
          <CardDescription>
            Your current email is: <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit((v) => updateEmailMutation.mutate(v))}>
            <CardContent>
              <FormField control={emailForm.control} name="newEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Email Address</FormLabel>
                  <FormControl><Input type="email" placeholder="new.email@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={updateEmailMutation.isPending}>
                {updateEmailMutation.isPending ? "Sending..." : "Request Email Change"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default EditProfilePage;