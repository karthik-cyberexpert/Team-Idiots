"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Type } from "lucide-react";

const TyperManagementPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer Management</h1>
      <p className="text-muted-foreground">
        Manage settings and content for the Typer application.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:rotate-x-0.5 hover:rotate-y-0.5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Manage Sample Texts</CardTitle>
            <Type className="h-6 w-6 text-vibrant-green" />
          </CardHeader>
          <CardContent>
            <CardDescription>
              Add, edit, or remove the sample texts used in the typing test.
            </CardDescription>
            {/* Add buttons or links for managing texts here */}
          </CardContent>
        </Card>

        <Card className="group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:rotate-x-0.5 hover:rotate-y-0.5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">View Typer Statistics</CardTitle>
            <Settings className="h-6 w-6 text-vibrant-purple" />
          </CardHeader>
          <CardContent>
            <CardDescription>
              Review overall typing speed and accuracy statistics from users.
            </CardDescription>
            {/* Add buttons or links for viewing stats here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TyperManagementPage;