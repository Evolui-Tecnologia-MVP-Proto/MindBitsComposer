import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function MondayMappingPage() {
  // Consulta para buscar os mapeamentos do Monday
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['/api/monday/mappings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/monday/mappings');
        if (!response.ok) {
          throw new Error('Falha ao carregar os mapeamentos');
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar mapeamentos:", error);
        return [];
      }
    }
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gerenciamento de Mapeamentos Monday.com</h1>
        <p className="text-gray-600 mt-2">
          Gerencie os mapeamentos entre os quadros do Monday.com e o sistema EVO-MindBits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de Quadros</CardTitle>
            <CardDescription>
              Configure quais quadros do Monday.com serão integrados e sincronizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              {isLoading ? 'Carregando...' : `${mappings.length} mapeamentos configurados`}
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin">
                Gerenciar Quadros
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de Colunas</CardTitle>
            <CardDescription>
              Associe as colunas do Monday.com com os campos do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Configure como os dados serão importados para o sistema
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/monday-mapeamento">
                Gerenciar Colunas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentação da Integração</CardTitle>
          <CardDescription>
            Aprenda como configurar e utilizar a integração com Monday.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">1. Configuração da Chave de API</h3>
              <p className="text-sm text-gray-600">
                Para iniciar, você precisa configurar sua chave de API do Monday.com em "Configurações da Integração".
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">2. Mapeamento de Quadros</h3>
              <p className="text-sm text-gray-600">
                Selecione os quadros que deseja integrar e configure os parâmetros de sincronização.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">3. Mapeamento de Colunas</h3>
              <p className="text-sm text-gray-600">
                Para cada quadro, configure quais colunas do Monday.com correspondem aos campos do sistema.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">4. Sincronização</h3>
              <p className="text-sm text-gray-600">
                Uma vez configurados, os dados serão sincronizados automaticamente conforme a programação definida.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}