import { useTheme } from "@/contexts/ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const SettingsPage = () => {
  const { theme, setTheme, fontSize, setFontSize, fontFamily, setFontFamily, magicTheme, setMagicTheme, gradientScope, setGradientScope } = useTheme();

  return (
    <div className="space-y-6 [perspective:1000px]">
      <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
      
      <Card className="group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:rotate-x-0.5 hover:rotate-y-0.5 shadow-md">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="flex-grow">Dark Mode</Label>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              disabled={theme === 'retro' || magicTheme !== 'none'}
            />
          </div>
          
          <div>
            <Label htmlFor="theme-selector">Theme</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as any)} disabled={magicTheme !== 'none'}>
              <SelectTrigger id="theme-selector" className="w-full mt-2">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="retro">Retro</SelectItem>
              </SelectContent>
            </Select>
            {magicTheme !== 'none' && (
              <p className="text-xs text-muted-foreground mt-2">Disable Magic Theme to change the base theme.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:rotate-x-0.5 hover:rotate-y-0.5 shadow-md">
        <CardHeader>
          <CardTitle>Magic Themes</CardTitle>
          <CardDescription>Enable dynamic and experimental themes.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={magicTheme}
            onValueChange={(value) => setMagicTheme(value as any)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="magic-none" />
              <Label htmlFor="magic-none">None (Standard)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="refresh" id="magic-refresh" />
              <Label htmlFor="magic-refresh">Theme on Refresh</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="click" id="magic-click" />
              <Label htmlFor="magic-click">Theme on Click</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gradient" id="magic-gradient" />
              <Label htmlFor="magic-gradient">Motion Gradient Text</Label>
            </div>
          </RadioGroup>
          {magicTheme === 'gradient' && (
            <div className="pt-4 mt-4 border-t">
              <Label>Gradient Scope</Label>
              <RadioGroup
                value={gradientScope}
                onValueChange={(value) => setGradientScope(value as any)}
                className="space-y-2 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="headings" id="scope-headings" />
                  <Label htmlFor="scope-headings">Headings Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="scope-full" />
                  <Label htmlFor="scope-full">Everything</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:rotate-x-0.5 hover:rotate-y-0.5 shadow-md">
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>Adjust the font settings for better readability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Font Size</Label>
            <RadioGroup
              value={fontSize}
              onValueChange={(value) => setFontSize(value as any)}
              className="flex items-center space-x-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sm" id="font-sm" />
                <Label htmlFor="font-sm">Small</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="md" id="font-md" />
                <Label htmlFor="font-md">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lg" id="font-lg" />
                <Label htmlFor="font-lg">Large</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="font-family-selector">Font Family</Label>
            <Select value={fontFamily} onValueChange={(value) => setFontFamily(value as any)}>
              <SelectTrigger id="font-family-selector" className="w-full mt-2">
                <SelectValue placeholder="Select a font family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sans">Sans-serif</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="mono">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;