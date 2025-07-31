import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  Calendar, 
  FileText, 
  AlertCircle, 
  ChevronRight,
  User,
  UserCheck,
  Check,
  X
} from "lucide-react";

interface ExecutionFormProps {
  nodeId: string;
  nodeType: 'startNode' | 'actionNode' | 'documentNode' | 'integrationNode' | 'endNode' | 'switchNode';
  nodeData: any;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ExecutionFormPanel({ 
  nodeId, 
  nodeType, 
  nodeData, 
  onSubmit, 
  onCancel,
  isLoading = false 
}: ExecutionFormProps) {
  // This component will use a factory pattern to render different forms
  // based on the nodeType
  
  const renderForm = () => {
    switch (nodeType) {
      case 'startNode':
        return <StartNodeForm nodeData={nodeData} onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
      case 'actionNode':
        return <ActionNodeForm nodeData={nodeData} onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
      case 'documentNode':
        return <DocumentNodeForm nodeData={nodeData} onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
      case 'integrationNode':
        return <IntegrationNodeForm nodeData={nodeData} onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
      case 'endNode':
        return <EndNodeForm nodeData={nodeData} onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
      case 'switchNode':
        return <SwitchNodeForm nodeData={nodeData} onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
      default:
        return <div className="text-red-500">Tipo de nó não suportado: {nodeType}</div>;
    }
  };

  return (
    <div className="execution-form-panel">
      {renderForm()}
    </div>
  );
}

// Individual form components for each node type
function ActionNodeForm({ nodeData, onSubmit, onCancel, isLoading }: any) {
  const [formData, setFormData] = React.useState({
    description: '',
    responsibleUser: '',
    dueDate: '',
    status: 'pending'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Executar Ação</CardTitle>
        <CardDescription>{nodeData?.label || 'Configurar execução da ação'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição da Ação</Label>
            <Textarea
              id="description"
              placeholder="Descreva os detalhes da ação..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="responsibleUser">Responsável</Label>
            <Select
              value={formData.responsibleUser}
              onValueChange={(value) => setFormData({ ...formData, responsibleUser: value })}
            >
              <SelectTrigger id="responsibleUser" className="mt-1">
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user1">João Silva</SelectItem>
                <SelectItem value="user2">Maria Santos</SelectItem>
                <SelectItem value="user3">Pedro Oliveira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dueDate">Prazo</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Executando...' : 'Executar Ação'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DocumentNodeForm({ nodeData, onSubmit, onCancel, isLoading }: any) {
  const [formData, setFormData] = React.useState({
    documentType: '',
    template: '',
    assignee: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Iniciar Documentação</CardTitle>
        <CardDescription>{nodeData?.label || 'Configurar documentação'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="documentType">Tipo de Documento</Label>
            <Select
              value={formData.documentType}
              onValueChange={(value) => setFormData({ ...formData, documentType: value })}
            >
              <SelectTrigger id="documentType" className="mt-1">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="procedure">Procedimento</SelectItem>
                <SelectItem value="policy">Política</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="template">Template</Label>
            <Select
              value={formData.template}
              onValueChange={(value) => setFormData({ ...formData, template: value })}
            >
              <SelectTrigger id="template" className="mt-1">
                <SelectValue placeholder="Selecione o template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template1">Template Padrão</SelectItem>
                <SelectItem value="template2">Template Técnico</SelectItem>
                <SelectItem value="template3">Template Executivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Iniciando...' : 'Iniciar Documentação'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function IntegrationNodeForm({ nodeData, onSubmit, onCancel, isLoading }: any) {
  const [formData, setFormData] = React.useState({
    executionMode: 'automatic',
    parameters: {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Executar Integração</CardTitle>
        <CardDescription>{nodeData?.label || 'Configurar integração'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta integração será executada com os parâmetros configurados.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="executionMode">Modo de Execução</Label>
            <Select
              value={formData.executionMode}
              onValueChange={(value) => setFormData({ ...formData, executionMode: value })}
            >
              <SelectTrigger id="executionMode" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automático</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Executando...' : 'Executar Integração'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EndNodeForm({ nodeData, onSubmit, onCancel, isLoading }: any) {
  const [formData, setFormData] = React.useState({
    conclusionType: 'complete',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Concluir Fluxo</CardTitle>
        <CardDescription>{nodeData?.label || 'Finalizar execução do fluxo'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="conclusionType">Tipo de Conclusão</Label>
            <Select
              value={formData.conclusionType}
              onValueChange={(value) => setFormData({ ...formData, conclusionType: value })}
            >
              <SelectTrigger id="conclusionType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Concluído com Sucesso</SelectItem>
                <SelectItem value="partial">Parcialmente Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre a conclusão..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Concluindo...' : 'Concluir Fluxo'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function StartNodeForm({ nodeData, onSubmit, onCancel, isLoading }: any) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({});
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Nó de Início</CardTitle>
        <CardDescription>{nodeData?.label || 'Este é o ponto de partida do fluxo'}</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O nó de início é executado automaticamente quando o fluxo é iniciado.
            Não requer configuração adicional.
          </AlertDescription>
        </Alert>
        
        {nodeData?.isExecuted === 'TRUE' && (
          <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Fluxo iniciado</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SwitchNodeForm({ nodeData, onSubmit, onCancel, isLoading }: any) {
  const [formData, setFormData] = React.useState({
    condition: '',
    value: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Nó de Condição</CardTitle>
        <CardDescription>{nodeData?.label || 'Configurar condição de decisão'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este nó avalia uma condição e direciona o fluxo para diferentes caminhos.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Valor de Entrada</Label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="text-sm font-mono">{nodeData?.inputSwitch || 'Não definido'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condição Esquerda</Label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm font-mono">{nodeData?.leftSwitch || 'Não definido'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condição Direita</Label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm font-mono">{nodeData?.rightSwitch || 'Não definido'}</p>
              </div>
            </div>
          </div>

          {nodeData?.isExecuted === 'TRUE' && (
            <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Condição avaliada</span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Fechar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}