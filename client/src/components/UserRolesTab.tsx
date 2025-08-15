import { UserRolesList } from "./UserRolesList";

export function UserRolesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Gerenciar User Roles</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as funções de usuário do sistema com suas respectivas permissões.
        </p>
      </div>
      
      <UserRolesList />
    </div>
  );
}