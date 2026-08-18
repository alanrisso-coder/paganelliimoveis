import { NextResponse } from "next/server";

/**
 * Converte um endereço em latitude/longitude via Nominatim (OpenStreetMap).
 * Servidor-side porque o Nominatim exige um User-Agent identificável e não
 * garante CORS para chamadas diretas do navegador.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endereco = searchParams.get("endereco");

    if (!endereco) {
      return NextResponse.json({ error: "Informe o endereço." }, { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(
      endereco,
    )}`;

    const resposta = await fetch(url, {
      headers: {
        "User-Agent": "PaganelliImoveis/1.0 (contato@paganelliimoveis.com.br)",
      },
    });

    if (!resposta.ok) {
      console.error("Erro ao consultar Nominatim:", resposta.status);
      return NextResponse.json({ data: null }, { status: 200 });
    }

    const resultados: Array<{ lat: string; lon: string }> = await resposta.json();
    const primeiro = resultados?.[0];

    if (!primeiro) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json(
      { data: { latitude: Number(primeiro.lat), longitude: Number(primeiro.lon) } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    return NextResponse.json({ data: null }, { status: 200 });
  }
}
