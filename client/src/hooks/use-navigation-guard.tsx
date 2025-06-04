import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavigationGuardContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  setSaveFunction: (fn: (() => void) | null) => void;
  checkAndNavigate: (path: string) => boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextType | null>(null);

interface NavigationGuardProviderProps {
  children: ReactNode;
}

export function NavigationGuardProvider({ children }: NavigationGuardProviderProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveFunction, setSaveFunction] = useState<(() => void) | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [, setLocation] = useLocation();

  const checkAndNavigate = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowModal(true);
      return false; // Block navigation
    }
    setLocation(path);
    return true; // Allow navigation
  }, [hasUnsavedChanges, setLocation]);

  const handleConfirm = (shouldSave: boolean) => {
    if (shouldSave && saveFunction) {
      // Executar salvamento ANTES de navegar
      try {
        saveFunction();
        // Aguardar um pequeno delay para garantir que o salvamento seja processado
        setTimeout(() => {
          setHasUnsavedChanges(false);
          setShowModal(false);
          
          if (pendingNavigation) {
            setLocation(pendingNavigation);
            setPendingNavigation(null);
          }
        }, 100);
      } catch (error) {
        console.error('Erro ao salvar:', error);
        // Em caso de erro, ainda permitir navegação
        setHasUnsavedChanges(false);
        setShowModal(false);
        
        if (pendingNavigation) {
          setLocation(pendingNavigation);
          setPendingNavigation(null);
        }
      }
    } else {
      // Se não vai salvar, navegar imediatamente
      setHasUnsavedChanges(false);
      setShowModal(false);
      
      if (pendingNavigation) {
        setLocation(pendingNavigation);
        setPendingNavigation(null);
      }
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setPendingNavigation(null);
  };

  return (
    <NavigationGuardContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        setSaveFunction,
        checkAndNavigate,
      }}
    >
      {children}
      
      <AlertDialog open={showModal} onOpenChange={setShowModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Atenção, ao sair do editor você perderá todo conteúdo editado que ainda não foi salvo. 
              Deseja salvar antes de continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleConfirm(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              Descartar
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleConfirm(true)}>
              Salvar e trocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider');
  }
  return context;
}