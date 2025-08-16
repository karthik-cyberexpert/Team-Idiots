import { Wrench } from 'lucide-react';

const MaintenancePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <Wrench className="h-16 w-16 text-primary mb-6 animate-spin [animation-duration:3s]" />
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
        Under Maintenance
      </h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Our site is currently undergoing scheduled maintenance. We should be back shortly. Thank you for your patience.
      </p>
    </div>
  );
};

export default MaintenancePage;