import { pool } from "./db";

// Direct database query helpers to avoid circular dependency issues
export async function getGenericTableByNameDirect(name: string) {
  try {
    console.log("🔍 [DB Helper] Buscando tabela genérica:", name);
    
    const result = await pool.query(
      'SELECT id, name, description, content, created_at, updated_at FROM generic_tables WHERE name = $1 LIMIT 1',
      [name]
    );
    
    if (result.rows.length === 0) {
      console.log("🔍 [DB Helper] Nenhum resultado encontrado para:", name);
      return null;
    }
    
    const row = result.rows[0];
    const genericTable = {
      id: row.id,
      name: row.name,
      description: row.description,
      content: row.content || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    console.log("🔍 [DB Helper] Resultado encontrado:", genericTable);
    return genericTable;
  } catch (error) {
    console.error("❌ [DB Helper] Erro ao buscar tabela genérica:", error);
    throw error;
  }
}