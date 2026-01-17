/**
 * Repository para buscar dados de instâncias WhatsApp no Supabase
 * Tabela: whatsapp_numbers
 */

import { supabase } from '../db/supabaseClient'

/**
 * Busca workspace_id por instance_name na tabela whatsapp_numbers
 * Retorna null se não encontrar
 */
export async function findWorkspaceByInstance(instanceName: string): Promise<{
  workspaceId: string
  whatsappNumberId: string
  instanceName: string
  apiKey: string | null
} | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .select('id, workspace_id, instance_name, api_key')
      .eq('instance_name', instanceName)
      .maybeSingle()

    if (error || !data) {
      console.error('Erro ao buscar workspace por instance:', error)
      return null
    }

    return {
      workspaceId: data.workspace_id as string,
      whatsappNumberId: data.id as string,
      instanceName: data.instance_name as string,
      apiKey: (data.api_key as string | null) || null,
    }
  } catch (error) {
    console.error('Erro ao buscar workspace por instance:', error)
    return null
  }
}

/**
 * Busca dados da instância Evolution por whatsappNumberId
 * Retorna instance_name e api_key para envio de mensagens
 */
export async function findEvolutionInstanceByWhatsappNumberId(
  whatsappNumberId: string
): Promise<{
  instanceName: string
  apiKey: string | null
  workspaceId: string
} | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .select('instance_name, api_key, workspace_id')
      .eq('id', whatsappNumberId)
      .maybeSingle()

    if (error || !data) {
      console.error('Erro ao buscar instância Evolution por whatsappNumberId:', error)
      return null
    }

    return {
      instanceName: data.instance_name as string,
      apiKey: (data.api_key as string | null) || null,
      workspaceId: data.workspace_id as string,
    }
  } catch (error) {
    console.error('Erro ao buscar instância Evolution por whatsappNumberId:', error)
    return null
  }
}
