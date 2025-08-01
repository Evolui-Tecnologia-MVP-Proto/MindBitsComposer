import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import AdminPage from "@/pages/admin-page";
import PreferencesPage from "@/pages/preferences-page";
import ConfiguracoesPage from "@/pages/configuracoes-page";
import TemplatesPage from "@/pages/templates-page";
import EditorPage from "@/pages/editor-page";
import LexicalPage from "@/pages/lexical-page";
import FluxosPage from "@/pages/fluxos-page";
import DocumentosPage from "@/pages/documentos-page";
import DocumentosPageRefact from "@/refact/pages/documentos-page_refact";
import PluginsPage from "@/pages/plugins-page";
import CadastrosGeraisPage from "@/pages/cadastros-gerais-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { NavigationGuardProvider } from "@/hooks/use-navigation-guard";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/preferences" component={PreferencesPage} />
      <ProtectedRoute path="/templates" component={TemplatesPage} />
      <ProtectedRoute path="/cadastros-gerais" component={CadastrosGeraisPage} />
      <ProtectedRoute path="/editor" component={EditorPage} />
      <ProtectedRoute path="/lexical" component={LexicalPage} />
      <ProtectedRoute path="/fluxos" component={FluxosPage} />
      <ProtectedRoute path="/documentos" component={DocumentosPage} />
      <ProtectedRoute path="/documentos-refact" component={DocumentosPageRefact} />
      <ProtectedRoute path="/plugins" component={PluginsPage} />
      <ProtectedRoute path="/configuracoes" component={ConfiguracoesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationGuardProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </NavigationGuardProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
