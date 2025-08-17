// Tipos para controle de acesso
export type AccessType = 'SHOW' | 'HIDE' | 'DISABLE';

export interface TabAccess {
  id: string;
  type?: AccessType;
}

export interface MenuAccess {
  id: string;
  type?: AccessType;
  tabs?: TabAccess[];
}

export interface AccessLevels {
  accessLevels?: {
    menus?: MenuAccess[];
  };
}

export interface UserRole {
  id: number;
  name: string;
  description: string;
  active: boolean;
  access?: AccessLevels;
}

// Função para verificar acesso a um menu
export function checkMenuAccess(userRole: UserRole | undefined, menuId: string): AccessType {
  // Se não tem role, não tem acesso
  if (!userRole || !userRole.access?.accessLevels?.menus) {
    return 'HIDE';
  }
  
  // Procura o menu específico
  const menu = userRole.access.accessLevels.menus.find(m => m.id === menuId);
  
  // Se não encontrou o menu, não tem acesso
  if (!menu) {
    return 'HIDE';
  }
  
  // Retorna o tipo de acesso (padrão é SHOW se não especificado)
  return menu.type || 'SHOW';
}

// Função para verificar acesso a uma tab dentro de um menu
export function checkTabAccess(userRole: UserRole | undefined, menuId: string, tabId: string): AccessType {
  // Se não tem role, não tem acesso
  if (!userRole || !userRole.access?.accessLevels?.menus) {
    return 'HIDE';
  }
  
  // Procura o menu específico
  const menu = userRole.access.accessLevels.menus.find(m => m.id === menuId);
  
  // Se não encontrou o menu, não tem acesso
  if (!menu) {
    return 'HIDE';
  }
  
  // Se o menu está oculto ou desabilitado, as tabs também estão
  if (menu.type === 'HIDE') {
    return 'HIDE';
  }
  
  // Se não tem definição de tabs, assume que todas estão visíveis
  if (!menu.tabs || menu.tabs.length === 0) {
    return menu.type === 'DISABLE' ? 'DISABLE' : 'SHOW';
  }
  
  // Procura a tab específica
  const tab = menu.tabs.find(t => t.id === tabId);
  
  // Se não encontrou a tab, não tem acesso
  if (!tab) {
    return 'HIDE';
  }
  
  // Se o menu está desabilitado, a tab também está
  if (menu.type === 'DISABLE') {
    return 'DISABLE';
  }
  
  // Retorna o tipo de acesso da tab (padrão é SHOW se não especificado)
  return tab.type || 'SHOW';
}

// Função helper para aplicar estilos baseados no tipo de acesso
export function getAccessStyles(accessType: AccessType): { 
  className?: string; 
  disabled?: boolean; 
  hidden?: boolean;
  onClick?: (e: React.MouseEvent) => void;
} {
  switch (accessType) {
    case 'HIDE':
      return { hidden: true };
    case 'DISABLE':
      return { 
        className: 'opacity-50 cursor-not-allowed pointer-events-none',
        disabled: true,
        onClick: (e) => e.preventDefault()
      };
    case 'SHOW':
    default:
      return {};
  }
}