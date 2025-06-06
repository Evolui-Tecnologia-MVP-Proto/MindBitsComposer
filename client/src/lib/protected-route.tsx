import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { FC } from "react";
import Layout from "@/components/Layout";

type ProtectedRouteProps = {
  path: string;
  component: FC;
};

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading, isFirstLogin } = useAuth();

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !user ? (
        <Redirect to="/auth" />
      ) : isFirstLogin ? (
        <Redirect to="/auth" />
      ) : (
        <Layout>
          <Component />
        </Layout>
      )}
    </Route>
  );
}
