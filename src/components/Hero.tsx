import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

const Hero = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleGetStarted = () => {
    if (session) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="flex-grow flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
        Welcome to Team-Idiots
      </h2>
      <p className="max-w-[600px] text-muted-foreground md:text-xl mb-8">
        The best place for your team to collaborate and build amazing things.
        Get started by logging in.
      </p>
      <Button size="lg" onClick={handleGetStarted}>
        <span className="flex items-center">
          Get Started <ArrowRight className="ml-2 h-5 w-5" />
        </span>
      </Button>
    </section>
  );
};

export default Hero;