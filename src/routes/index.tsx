import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe,
  Lock,
  Menu,
  Moon,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/spa/theme-provider";
import { Button } from "@/components/ui/button";
import { authQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const NAV_SECTIONS = ["features", "pricing", "testimonials"] as const;
type NavSection = (typeof NAV_SECTIONS)[number];

function useScrollSpy() {
  const [activeSection, setActiveSection] = useState<NavSection | null>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const sectionId of NAV_SECTIONS) {
      const element = document.getElementById(sectionId);
      if (!element) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(sectionId);
            }
          }
        },
        {
          rootMargin: "-20% 0px -70% 0px",
          threshold: 0,
        },
      );

      observer.observe(element);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, []);

  return activeSection;
}

function useCountUp(
  end: number,
  duration: number = 2000,
  startOnView: boolean = true,
) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - (1 - progress) ** 4;
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

// ============================================================================
// TYPING ANIMATION COMPONENT
// ============================================================================

const TYPING_WORDS = ["faster", "better", "nicer", "sooner", "smarter"];

function TypingText() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = TYPING_WORDS[wordIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseDuration = 2000;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (text.length < currentWord.length) {
            setText(currentWord.slice(0, text.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          if (text.length > 0) {
            setText(text.slice(0, -1));
          } else {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % TYPING_WORDS.length);
          }
        }
      },
      text.length === TYPING_WORDS[wordIndex].length && !isDeleting
        ? pauseDuration
        : typingSpeed,
    );

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex]);

  return (
    <span className="relative inline-block min-w-[200px] text-left sm:min-w-[280px]">
      <span>{text}</span>
      <span className="animate-blink ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] bg-current" />
    </span>
  );
}

// ============================================================================
// LOGO COMPONENT
// ============================================================================

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-8", className)}
    >
      {/* Outer shell */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="8"
        className="fill-foreground"
      />
      {/* Inner cutout creating depth */}
      <rect
        x="6"
        y="6"
        width="28"
        height="28"
        rx="5"
        className="fill-background"
      />
      {/* Abstract "S" shape */}
      <path
        d="M14 12C14 12 18 12 22 12C26 12 28 14 28 17C28 20 26 21 22 21H18C14 21 12 23 12 26C12 29 14 31 18 31C22 31 26 31 26 31"
        className="stroke-foreground"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Accent dot */}
      <circle cx="30" cy="12" r="3" className="fill-foreground" />
    </svg>
  );
}

// ============================================================================
// SIMPLE THEME TOGGLE
// ============================================================================

function SimpleThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  // Determine actual theme (resolve "system" to actual value)
  useEffect(() => {
    const checkDark = () => {
      if (theme === "system") {
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDark(theme === "dark");
      }
    };

    checkDark();

    // Listen for system preference changes
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", checkDark);
    return () => media.removeEventListener("change", checkDark);
  }, [theme]);

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "bg-muted hover:bg-muted/80 relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className,
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Track icons */}
      <Sun className="text-muted-foreground absolute left-2 size-4" />
      <Moon className="text-muted-foreground absolute right-2 size-4" />

      {/* Sliding thumb */}
      <span
        className={cn(
          "bg-foreground flex size-6 items-center justify-center rounded-full shadow-sm transition-transform duration-300",
          isDark ? "translate-x-6" : "translate-x-0",
        )}
      >
        {isDark ? (
          <Moon className="text-background size-3.5" />
        ) : (
          <Sun className="text-background size-3.5" />
        )}
      </span>
    </button>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Suspense fallback={<NavbarSkeleton />}>
        <Navbar />
      </Suspense>
      <main>
        <HeroSection />
        <LogoCloud />
        <FeaturesSection />
        <StatsSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

// ============================================================================
// NAVBAR
// ============================================================================

function NavbarSkeleton() {
  return (
    <header className="border-border/50 bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="bg-muted h-6 w-24 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-8 w-32 animate-pulse rounded" />
      </div>
    </header>
  );
}

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeSection = useScrollSpy();

  return (
    <header className="border-border/50 bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">ShellSPA</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_SECTIONS.map((section) => (
            <a
              key={section}
              href={`#${section}`}
              className={cn(
                "relative text-sm transition-colors",
                activeSection === section
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
              {activeSection === section && (
                <span className="bg-foreground absolute -bottom-1 left-0 h-0.5 w-full rounded-full" />
              )}
            </a>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <SimpleThemeToggle />
          <Suspense
            fallback={
              <div className="bg-muted h-8 w-24 animate-pulse rounded-lg" />
            }
          >
            <AuthButtons />
          </Suspense>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="size-6" />
          ) : (
            <Menu className="size-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-border/50 bg-background border-t md:hidden">
          <nav className="flex flex-col gap-4 px-6 py-4">
            {NAV_SECTIONS.map((section) => (
              <a
                key={section}
                href={`#${section}`}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm transition-colors",
                  activeSection === section
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </a>
            ))}
            <div className="border-border mt-2 flex items-center gap-3 border-t pt-4">
              <SimpleThemeToggle />
              <Suspense
                fallback={
                  <div className="bg-muted h-8 w-24 animate-pulse rounded-lg" />
                }
              >
                <AuthButtons />
              </Suspense>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function AuthButtons() {
  const { data: user } = useSuspenseQuery(authQueryOptions());

  if (user) {
    return (
      <Button size="sm" render={<Link to="/app" />}>
        Go to Dashboard
        <ArrowRight className="size-4" data-icon="inline-end" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" render={<Link to="/login" />}>
        Sign in
      </Button>
      <Button size="sm" render={<Link to="/signup" />}>
        Get Started
      </Button>
    </div>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-muted/30 absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-current/10 bg-current/5 px-4 py-1.5 text-sm">
            <Sparkles className="size-4" />
            <span>Now with AI-powered insights</span>
          </div>

          {/* Headline with Typing Animation */}
          <h1 className="animate-fade-in text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Build <TypingText />.
            <br />
            <span className="text-muted-foreground">Ship with confidence.</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-in-delayed text-muted-foreground mx-auto mt-6 max-w-xl text-lg md:text-xl">
            The modern platform for teams who want to move fast without breaking
            things. Streamline your workflow and focus on what matters.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in-delayed mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" render={<Link to="/signup" />}>
              Start Free Trial
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" render={<a href="#features" />}>
              Learn More
            </Button>
          </div>

          {/* Social Proof */}
          <p className="text-muted-foreground mt-8 text-sm">
            Trusted by 10,000+ teams worldwide
          </p>
        </div>

        {/* Hero Visual */}
        <div className="animate-fade-in-delayed relative mt-16 md:mt-24">
          <div className="border-border bg-card relative mx-auto aspect-[16/10] max-w-4xl overflow-hidden rounded-xl border shadow-2xl">
            <div className="bg-muted/50 border-border flex h-10 items-center gap-2 border-b px-4">
              <div className="bg-border size-3 rounded-full" />
              <div className="bg-border size-3 rounded-full" />
              <div className="bg-border size-3 rounded-full" />
              <div className="bg-muted ml-4 h-5 flex-1 rounded" />
            </div>
            <div className="grid h-[calc(100%-40px)] grid-cols-4 gap-4 p-4">
              <div className="bg-muted/50 col-span-1 rounded-lg" />
              <div className="col-span-3 space-y-4">
                <div className="bg-muted/30 h-8 w-48 rounded" />
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-muted/20 aspect-video rounded-lg"
                    />
                  ))}
                </div>
                <div
                  className="bg-muted/10 flex-1 rounded-lg"
                  style={{ minHeight: "120px" }}
                />
              </div>
            </div>
          </div>
          {/* Gradient overlay */}
          <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// LOGO CLOUD
// ============================================================================

function LogoCloud() {
  const logos = ["Acme Corp", "Quantum", "Nexus", "Vertex", "Pulse", "Helix"];

  return (
    <section className="border-border/50 border-y py-12">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-muted-foreground mb-8 text-center text-sm uppercase tracking-wider">
          Trusted by innovative teams
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((logo) => (
            <div
              key={logo}
              className="text-muted-foreground/50 text-lg font-semibold tracking-tight"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURES SECTION
// ============================================================================

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Built for speed from the ground up. Experience sub-second load times and instant interactions.",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description:
      "Bank-level encryption and compliance with SOC 2, GDPR, and HIPAA. Your data is always safe.",
  },
  {
    icon: Globe,
    title: "Global Scale",
    description:
      "Deploy to 200+ edge locations worldwide. Serve your users with minimal latency anywhere.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Get instant insights into your performance. Make data-driven decisions with confidence.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center md:mb-24">
          <p className="text-muted-foreground mb-4 text-sm font-medium uppercase tracking-wider">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Everything you need to scale
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Powerful features designed for modern teams. Focus on building, we
            handle the rest.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                "group border-border hover:border-foreground/20 relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 hover:shadow-lg",
                index % 2 === 1 && "md:translate-y-8",
              )}
            >
              {/* Icon */}
              <div className="bg-foreground text-background mb-6 inline-flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="size-6" />
              </div>

              {/* Content */}
              <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 size-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-current opacity-[0.02] transition-all duration-300 group-hover:scale-150 group-hover:opacity-[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// STATS SECTION
// ============================================================================

const stats = [
  { value: 99.99, suffix: "%", label: "Uptime SLA", decimals: 2 },
  { value: 10, suffix: "M+", label: "Requests/day", decimals: 0 },
  { value: 50, prefix: "<", suffix: "ms", label: "Avg. Response", decimals: 0 },
  { value: 150, suffix: "+", label: "Countries", decimals: 0 },
];

function StatCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const { count, ref } = useCountUp(
    decimals > 0 ? value * 10 ** decimals : value,
    2000,
  );
  const displayValue =
    decimals > 0 ? (count / 10 ** decimals).toFixed(decimals) : count;

  return (
    <div ref={ref} className="text-4xl font-bold tracking-tight md:text-5xl">
      {prefix}
      {displayValue}
      {suffix}
    </div>
  );
}

function StatsSection() {
  return (
    <section className="bg-foreground text-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <StatCounter
                value={stat.value}
                suffix={stat.suffix}
                prefix={stat.prefix}
                decimals={stat.decimals}
              />
              <div className="text-background/60 mt-2 text-sm uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING SECTION
// ============================================================================

const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Perfect for side projects and experiments.",
    features: [
      "Up to 1,000 requests/month",
      "1 team member",
      "Community support",
      "Basic analytics",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For growing teams who need more power.",
    features: [
      "Unlimited requests",
      "10 team members",
      "Priority support",
      "Advanced analytics",
      "Custom domains",
      "API access",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For organizations with advanced needs.",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Dedicated support",
      "SLA guarantee",
      "SSO / SAML",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-muted-foreground mb-4 text-sm font-medium uppercase tracking-wider">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            No hidden fees. No surprises. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8",
                plan.highlighted
                  ? "border-foreground bg-foreground text-background shadow-2xl"
                  : "border-border",
              )}
            >
              {plan.highlighted && (
                <div className="bg-background text-foreground absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span
                    className={
                      plan.highlighted
                        ? "text-background/60"
                        : "text-muted-foreground"
                    }
                  >
                    /{plan.period}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm",
                    plan.highlighted
                      ? "text-background/70"
                      : "text-muted-foreground",
                  )}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        plan.highlighted
                          ? "text-background/80"
                          : "text-foreground",
                      )}
                    />
                    <span
                      className={
                        plan.highlighted
                          ? "text-background/90"
                          : "text-muted-foreground"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? "secondary" : "outline"}
                size="lg"
                className={cn(
                  "w-full",
                  plan.highlighted &&
                    "bg-background text-foreground hover:bg-background/90",
                )}
                render={<Link to="/signup" />}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TESTIMONIALS SECTION
// ============================================================================

const testimonials = [
  {
    quote:
      "ShellSPA transformed how we build products. What used to take weeks now takes days. The developer experience is unmatched.",
    author: "Sarah Chen",
    role: "CTO",
    company: "Quantum Labs",
  },
  {
    quote:
      "The performance gains alone paid for the investment in the first month. Our users noticed the difference immediately.",
    author: "Marcus Rodriguez",
    role: "Lead Engineer",
    company: "Nexus Inc.",
  },
  {
    quote:
      "Finally, a platform that understands what modern teams need. The support team is incredibly responsive and helpful.",
    author: "Emily Watson",
    role: "Product Manager",
    company: "Vertex Systems",
  },
];

function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-muted-foreground mb-4 text-sm font-medium uppercase tracking-wider">
            Testimonials
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Loved by teams everywhere
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className="bg-card border-border flex flex-col rounded-2xl border p-8"
            >
              {/* Quote */}
              <blockquote className="text-foreground/90 flex-1 text-lg leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="border-border mt-8 flex items-center gap-4 border-t pt-6">
                <div className="bg-muted size-12 rounded-full" />
                <div>
                  <div className="font-medium">{testimonial.author}</div>
                  <div className="text-muted-foreground text-sm">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CTA SECTION
// ============================================================================

function CTASection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="bg-foreground text-background relative overflow-hidden rounded-3xl px-8 py-20 text-center md:px-16 md:py-28">
          {/* Animated background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Gradient orbs */}
            <div className="animate-pulse-slow absolute -top-1/3 -left-1/4 h-[500px] w-[500px] rounded-full bg-current opacity-[0.04] blur-3xl" />
            <div className="animate-pulse-slow absolute -right-1/4 -bottom-1/3 h-[600px] w-[600px] rounded-full bg-current opacity-[0.04] blur-3xl [animation-delay:1s]" />

            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />

            {/* Floating shapes */}
            <div className="animate-float absolute top-10 left-[15%] size-3 rounded-full bg-current opacity-20" />
            <div className="animate-float absolute top-20 right-[20%] size-2 rounded-full bg-current opacity-15 [animation-delay:0.5s]" />
            <div className="animate-float absolute bottom-16 left-[25%] size-4 rounded-full bg-current opacity-10 [animation-delay:1s]" />
            <div className="animate-float absolute bottom-24 right-[15%] size-2 rounded-full bg-current opacity-20 [animation-delay:1.5s]" />
          </div>

          <div className="relative">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-current/20 bg-current/10 px-4 py-1.5 text-sm">
              <Sparkles className="size-4" />
              <span>14-day free trial, no credit card required</span>
            </div>

            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Ready to transform
              <br />
              your workflow?
            </h2>
            <p className="text-background/70 mx-auto mt-6 max-w-xl text-lg">
              Join thousands of teams already using ShellSPA to build better
              products, faster. Get started in minutes.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 group h-12 px-8 text-base shadow-lg transition-all hover:shadow-xl"
                render={<Link to="/signup" />}
              >
                Start Free Trial
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  data-icon="inline-end"
                />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-background hover:bg-background/10 hover:text-background h-12 px-8 text-base"
                render={<a href="#pricing" />}
              >
                View Pricing
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="text-background/50 mt-10 flex flex-wrap items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <Check className="size-4" />
                Free 14-day trial
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

const footerLinks = {
  Product: ["Features", "Pricing", "Changelog", "Documentation"],
  Company: ["About", "Blog", "Careers", "Press"],
  Resources: ["Community", "Contact", "Support", "Status"],
  Legal: ["Privacy", "Terms", "Security", "Cookies"],
};

function Footer() {
  return (
    <footer className="border-border/50 border-t py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="text-lg font-semibold tracking-tight">
                ShellSPA
              </span>
            </Link>
            <p className="text-muted-foreground mt-4 text-sm">
              Build faster. Ship with confidence.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-sm font-semibold">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-border/50 mt-16 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} ShellSPA. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <SimpleThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
