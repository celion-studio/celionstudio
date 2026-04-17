import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductEditor from "./pages/ProductEditor";
import Automations from "./pages/Automations";
import AutomationEditor from "./pages/AutomationEditor";
import DmLogs from "./pages/DmLogs";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import DashboardLayout from "./components/DashboardLayout";

function WithDashboard({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/dashboard">
        <WithDashboard><Dashboard /></WithDashboard>
      </Route>

      <Route path="/products">
        <WithDashboard><Products /></WithDashboard>
      </Route>
      <Route path="/products/new">
        <WithDashboard><ProductEditor /></WithDashboard>
      </Route>
      <Route path="/products/:id/edit">
        {(params) => (
          <WithDashboard><ProductEditor /></WithDashboard>
        )}
      </Route>

      <Route path="/automations">
        <WithDashboard><Automations /></WithDashboard>
      </Route>
      <Route path="/automations/new">
        <WithDashboard><AutomationEditor /></WithDashboard>
      </Route>
      <Route path="/automations/:id/edit">
        {(params) => (
          <WithDashboard><AutomationEditor /></WithDashboard>
        )}
      </Route>

      <Route path="/logs">
        <WithDashboard><DmLogs /></WithDashboard>
      </Route>

      <Route path="/pricing">
        <WithDashboard><Pricing /></WithDashboard>
      </Route>

      <Route path="/settings">
        <WithDashboard><Settings /></WithDashboard>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
