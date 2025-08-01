import { Button } from "@/components/ui/button";

interface FlowInspectorProps {
  selectedFlowNode: any;
  setShowFlowInspector: (show: boolean) => void;
  setSelectedFlowNode: (node: any) => void;
  setIsFlowInspectorPinned: (pinned: boolean) => void;
}

export function FlowInspector({
  selectedFlowNode,
  setShowFlowInspector,
  setSelectedFlowNode,
  setIsFlowInspectorPinned,
}: FlowInspectorProps) {
  if (!selectedFlowNode) return null;
  
  const getNodeTypeLabel = (nodeType: string) => {
    const typeMap: { [key: string]: string } = {
      'startNode': 'Início',
      'endNode': 'Fim',
      'actionNode': 'Ação',
      'documentNode': 'Documento',
      'integrationNode': 'Integração',
      'switchNode': 'Condição'
    };
    return typeMap[nodeType] || nodeType;
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold">Inspetor de Propriedades</h3>
          <p className="text-sm text-gray-600 font-mono">
            {getNodeTypeLabel(selectedFlowNode.type)} - {selectedFlowNode.id}
          </p>
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Status de Execução</p>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              selectedFlowNode.data.isExecuted === 'TRUE' 
                ? 'bg-blue-100 text-blue-800' 
                : selectedFlowNode.data.isPendingConnected
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {selectedFlowNode.data.isExecuted === 'TRUE' 
                ? 'Executado' 
                : selectedFlowNode.data.isPendingConnected
                ? 'Pendente'
                : 'N.Exec.'}
            </div>
          </div>

          {selectedFlowNode.data.actionType && (
            <div>
              <p className="text-sm font-medium text-gray-700">Tipo de Ação</p>
              <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.actionType}</p>
            </div>
          )}

          {selectedFlowNode.data.description && (
            <div>
              <p className="text-sm font-medium text-gray-700">Descrição</p>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                {selectedFlowNode.data.description}
              </p>
            </div>
          )}

          {selectedFlowNode.data.docType && (
            <div>
              <p className="text-sm font-medium text-gray-700">Tipo de Documento</p>
              <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.docType}</p>
            </div>
          )}

          {selectedFlowNode.data.integrType && (
            <div>
              <p className="text-sm font-medium text-gray-700">Tipo de Integração</p>
              <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.integrType}</p>
            </div>
          )}

          {selectedFlowNode.data.service && (
            <div>
              <p className="text-sm font-medium text-gray-700">Serviço</p>
              <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.service}</p>
            </div>
          )}

          {selectedFlowNode.data.FromType && (
            <div>
              <p className="text-sm font-medium text-gray-700">Tipo de Origem</p>
              <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.FromType}</p>
            </div>
          )}

          {selectedFlowNode.type === 'switchNode' && selectedFlowNode.data.switchField && (
            <div>
              <p className="text-sm font-medium text-gray-700">Campo de Condição</p>
              <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.switchField}</p>
            </div>
          )}

          {selectedFlowNode.type === 'switchNode' && (selectedFlowNode.data.leftSwitch || selectedFlowNode.data.rightSwitch) && (
            <div>
              <p className="text-sm font-medium text-gray-700">Valores de Switch</p>
              <div className="space-y-2">
                {selectedFlowNode.data.leftSwitch && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 font-mono">
                      {Array.isArray(selectedFlowNode.data.leftSwitch) 
                        ? selectedFlowNode.data.leftSwitch.join(', ') 
                        : selectedFlowNode.data.leftSwitch}
                    </span>
                  </div>
                )}
                {selectedFlowNode.data.rightSwitch && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 font-mono">
                      {Array.isArray(selectedFlowNode.data.rightSwitch) 
                        ? selectedFlowNode.data.rightSwitch.join(', ') 
                        : selectedFlowNode.data.rightSwitch}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedFlowNode.data.isAproved && (
            <div>
              <p className="text-sm font-medium text-gray-700">Status de Aprovação</p>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                selectedFlowNode.data.isAproved === 'TRUE' 
                  ? 'bg-green-100 text-green-800' 
                  : selectedFlowNode.data.isAproved === 'FALSE'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedFlowNode.data.isAproved === 'TRUE' 
                  ? 'Aprovado' 
                  : selectedFlowNode.data.isAproved === 'FALSE'
                  ? 'Rejeitado'
                  : 'Indefinido'}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={() => {
              setShowFlowInspector(false);
              setSelectedFlowNode(null);
              setIsFlowInspectorPinned(false);
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Fechar Inspetor
          </Button>
        </div>
      </div>
    </div>
  );
}