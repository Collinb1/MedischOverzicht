import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LowStockOverview from "@/pages/low-stock-overview";
import EmailSettings from "@/pages/email-settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/voorraad-overzicht" component={LowStockOverview} />
      <Route path="/email-settings" component={EmailSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
