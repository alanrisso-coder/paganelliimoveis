import { useEffect, useState } from "react";
import {
  obterImoveis,
  obterAnuncios,
  obterClientes,
  type DbImovel,
  type DbAnuncio,
  type DbCliente,
} from "./supabase-client";

export interface EstadoSupabase {
  imoveis: DbImovel[];
  anuncios: DbAnuncio[];
  clientes: DbCliente[];
  carregado: boolean;
  erro: string | null;
}

const CACHE_KEY = "paganelli:supabase-cache";
const CACHE_VALIDITY = 5 * 60 * 1000; // 5 minutos

interface CacheData {
  timestamp: number;
  imoveis: DbImovel[];
  anuncios: DbAnuncio[];
  clientes: DbCliente[];
}

function obterCacheLocal(): CacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as CacheData;
    const agora = Date.now();

    // Cache expirou?
    if (agora - data.timestamp > CACHE_VALIDITY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function salvarCacheLocal(data: Omit<CacheData, "timestamp">) {
  try {
    const cache: CacheData = {
      timestamp: Date.now(),
      ...data,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Falha ao salvar cache, continua sem ele
  }
}

export function useSupabaseSync(): EstadoSupabase {
  const [estado, setEstado] = useState<EstadoSupabase>({
    imoveis: [],
    anuncios: [],
    clientes: [],
    carregado: false,
    erro: null,
  });

  useEffect(() => {
    async function carregar() {
      try {
        // Tentar usar cache primeiro
        const cache = obterCacheLocal();
        if (cache) {
          setEstado({
            imoveis: cache.imoveis,
            anuncios: cache.anuncios,
            clientes: cache.clientes,
            carregado: true,
            erro: null,
          });
          return;
        }

        // Carregar do Supabase
        const [imoveis, anuncios, clientes] = await Promise.all([
          obterImoveis(),
          obterAnuncios(),
          obterClientes(),
        ]);

        // Salvar no cache local
        salvarCacheLocal({ imoveis, anuncios, clientes });

        setEstado({
          imoveis,
          anuncios,
          clientes,
          carregado: true,
          erro: null,
        });
      } catch (erro) {
        console.error("Erro ao carregar dados do Supabase:", erro);
        setEstado((prev) => ({
          ...prev,
          carregado: true,
          erro: erro instanceof Error ? erro.message : "Erro desconhecido",
        }));
      }
    }

    carregar();
  }, []);

  return estado;
}
