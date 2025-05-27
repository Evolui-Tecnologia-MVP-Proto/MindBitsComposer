import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function DebugMondayPage() {
  const [boardId, setBoardId] = useState("4197389343");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCapture = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/monday-full-board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ boardId }),
      });

      const data = await response.json();
      setResult(data);
      console.log("📦 Resultado da captura:", data);
    } catch (error) {
      console.error("❌ Erro:", error);
      setResult({ error: "Erro na requisição" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug Monday.com API</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capturar JSON Completo do Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="boardId">Board ID</Label>
            <Input
              id="boardId"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              placeholder="ID do board (ex: 4197389343)"
            />
          </div>

          <Button 
            onClick={handleCapture} 
            disabled={loading || !boardId}
            className="w-full"
          >
            {loading ? "Capturando..." : "Capturar JSON Bruto do Board"}
          </Button>

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Resultado:</h3>
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {result.success && (
                <div className="text-green-600 font-medium">
                  ✅ {result.message}
                  <br />
                  📁 Arquivo salvo: {result.filename}
                </div>
              )}

              {result.error && (
                <div className="text-red-600 font-medium">
                  ❌ {result.error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Query GraphQL Usada</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`query GetItemFiles($boardId: Int!) {
  boards(ids: [$boardId]) {
    items {
      id
      name
      column_values {
        id
        type
        value
      }
    }
  }
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}