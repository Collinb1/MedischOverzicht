import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProfessionalErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showRetry?: boolean;
  showGoHome?: boolean;
}

export function ProfessionalError({ 
  title = "Er is iets misgegaan",
  message = "We konden de gevraagde gegevens niet laden. Probeer het opnieuw.",
  onRetry,
  onGoHome,
  showRetry = true,
  showGoHome = false 
}: ProfessionalErrorProps) {
  return (
    <div className="medical-container py-12">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {title}
          </h3>
          
          <p className="text-slate-600 mb-6">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showRetry && onRetry && (
              <Button 
                onClick={onRetry}
                className="btn-medical-primary"
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Opnieuw Proberen
              </Button>
            )}
            
            {showGoHome && onGoHome && (
              <Button 
                onClick={onGoHome}
                variant="outline"
                className="btn-medical-secondary"
                data-testid="button-go-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Naar Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfessionalErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}