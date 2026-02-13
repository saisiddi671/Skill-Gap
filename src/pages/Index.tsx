import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, BookOpen, ClipboardCheck, ChevronRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Target className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">SkillGap</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground max-w-4xl mx-auto leading-tight">
          Bridge the Gap Between Your{" "}
          <span className="text-primary">Current Skills</span> and{" "}
          <span className="text-primary">Dream Career</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
          Identify skill gaps, get personalized recommendations, and track your progress 
          towards your ideal job role with our intelligent analyzer.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to="/register">
              Start Free Analysis
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24">
        <h2 className="text-3xl font-bold text-center text-foreground mb-4">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Our comprehensive skill gap analysis helps you understand exactly what you need 
          to achieve your career goals
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Define Your Goals</h3>
            <p className="text-sm text-muted-foreground">
              Set your target job role and career aspirations to get personalized insights
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Take Assessments</h3>
            <p className="text-sm text-muted-foreground">
              Evaluate your current skill levels through targeted assessments
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Analyze Gaps</h3>
            <p className="text-sm text-muted-foreground">
              Get a detailed breakdown of skills you have and skills you need to develop
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Learn & Grow</h3>
            <p className="text-sm text-muted-foreground">
              Follow personalized recommendations to close your skill gaps
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="bg-primary/5 border rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Accelerate Your Career?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of professionals who have identified their skill gaps and 
            are actively working towards their dream careers.
          </p>
          <Button size="lg" asChild>
            <Link to="/register">
              Create Free Account
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 SkillGap Analyzer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
