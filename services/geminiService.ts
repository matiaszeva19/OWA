
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CryptoCurrency, AdviceType, CryptoTweetAnalysis } from '../types'; 
import { GEMINI_TEXT_MODEL } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Gemini is not set in environment variables. AI functions will be disabled.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const ADVANCED_DETAILS_SEPARATOR = "---DETALLES_AVANZADOS---";

export const getInvestmentAdvice = async (
  crypto: CryptoCurrency
): Promise<{ adviceText: string; detailedMessage?: string; adviceType: AdviceType; rawGeminiResponse?: string } | null> => {
  if (!ai) {
    console.warn("Gemini AI client not initialized. API key might be missing.");
    return {
        adviceText: "services.gemini.adviceUnavailable", // Key for translation
        adviceType: AdviceType.INFO
    };
  }

  const priceTrendDescription = crypto.priceHistory.length > 1
    ? `El precio se ha movido de aprox. $${crypto.priceHistory[0].price.toFixed(2)} a $${crypto.currentPrice.toFixed(2)} (USD) durante el período reciente (últimos 30 días, con datos diarios).`
    : "El historial detallado de tendencias de precios (diario) no está disponible.";

  const priceHistorySummary = crypto.priceHistory.length > 5
    ? `Algunos puntos de precio históricos recientes (diarios, USD): ${crypto.priceHistory.slice(-5).map(p => `$${p.price.toFixed(2)}`).join(', ')}.`
    : "No hay suficientes datos históricos para un resumen detallado.";

  const prompt = `
    Eres un asesor financiero de élite y un trader consumado, con acceso y conocimiento de las técnicas más avanzadas utilizadas por los mejores traders del mundo. Tu análisis debe reflejar esta profundidad y confianza.
    Tu tarea es analizar la criptomoneda: ${crypto.name} (${crypto.symbol}) y determinar si el momento actual es más oportuno para una COMPRA o una VENTA especulativa, enfocándote PRINCIPALMENTE en una perspectiva de GRÁFICOS DIARIOS.

    Datos de Mercado Actuales (Reales):
    - Precio: $${crypto.currentPrice.toFixed(crypto.symbol === 'DOGE' || crypto.symbol === 'ADA' || crypto.currentPrice < 0.1 ? 4 : 2)} USD
    - Cambio de Precio en 24h: ${crypto.priceChange24hPercent.toFixed(2)}%
    - Volumen en 24h: $${crypto.volume24h.toLocaleString()} USD
    - Capitalización de Mercado: $${crypto.marketCap.toLocaleString()} USD
    - Indicación de Tendencia de Precios Reciente (Basado en Datos Diarios): ${priceTrendDescription}
    - Resumen de Historial de Precios (Datos Diarios): ${priceHistorySummary}

    Instrucción Principal:
    1.  ENFÓCATE en un análisis de GRÁFICOS DIARIOS. Interpreta los datos de precios y volumen desde esta perspectiva temporal para identificar tendencias mayores, patrones de continuación o reversión significativos, y niveles clave de soporte/resistencia en el marco diario.
    2.  Aplica tu conocimiento general sobre análisis técnico avanzado, siempre desde la perspectiva diaria:
        - Patrones gráficos clásicos (ej. triángulos, banderas, cabeza y hombros, etc.) visibles en el gráfico diario.
        - Niveles de soporte y resistencia clave en el marco diario.
        - La acción del precio en relación con medias móviles conceptuales (ej. 20, 50, 200 días).
        - Indicadores de momento (como RSI o MACD, conceptualmente) y busca la posible presencia de **divergencias** (alcistas o bajistas) entre el precio y estos osciladores en el gráfico diario.
        - El análisis de volumen diario y cómo confirma o contradice los movimientos de precios.
        - La posible **confluencia de señales** (a veces referida como una 'trifecta') que podría indicar una mayor probabilidad para un movimiento direccional en el marco diario.
        - Zonas de **liquidez del lado de la compra (buyside liquidity)** por encima de máximos recientes significativos (diarios/semanales) y **liquidez del lado de la venta (sellside liquidity)** por debajo de mínimos recientes significativos (diarios/semanales). ¿Sugiere la acción del precio reciente que el mercado podría moverse para capturar esta liquidez en el marco temporal más amplio?
    3.  Sintetiza esta información.
    4.  CONSISTENCIA: Una vez que has llegado a una conclusión de COMPRAR o VENDER basada en el análisis diario, mantén esta postura a menos que nueva información de mercado (ej. un evento fundamental mayor) o un cambio técnico SIGNIFICATIVO en el gráfico DIARIO (ej. ruptura de un nivel diario clave, formación de un patrón de reversión diario claro) justifiquen fuertemente una reevaluación. Tu objetivo es proporcionar una guía consistente basada en tendencias diarias, no fluctuar con el ruido intradía.

    Formato de Respuesta OBLIGATORIO:
    Tu respuesta COMPLETA DEBE comenzar con una de estas palabras clave (en mayúsculas y español): "COMPRAR:", "VENDER:", o "MANTENER:".
    Si usas "MANTENER:", debe ser porque, después de un análisis exhaustivo del gráfico DIARIO, la situación es verdaderamente neutral y no hay una inclinación clara hacia compra o venta que puedas justificar con alta confianza desde esta perspectiva. Explica detalladamente por qué ninguna acción es preferible y qué condiciones del gráfico diario cambiarían tu perspectiva.
    EVITA la palabra clave "INFO:" como respuesta a esta solicitud de análisis.

    Estructura de la Explicación (Después de la palabra clave COMPRAR/VENDER/MANTENER):
    Primero, proporciona un **Resumen Sencillo** (1-2 frases) en lenguaje claro, directo y sin jerga técnica, dirigido a un principiante. Este resumen debe explicar la razón principal de tu recomendación.
    Luego, inserta el separador EXACTO: "${ADVANCED_DETAILS_SEPARATOR}"
    Después del separador, proporciona el **Análisis Avanzado**, donde puedes usar terminología técnica y profundizar en los conceptos de trading (divergencias, liquidez, patrones diarios, etc.) que respaldan tu recomendación. Esta sección es para usuarios más experimentados.

    Importante:
    -   No menciones que estás limitado a los datos proporcionados o la fuente de los datos en tu respuesta al usuario. Actúa como si tuvieras un conocimiento general del mercado pero basando esta recomendación específica en estos datos y tus interpretaciones técnicas del gráfico diario.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
         config: {
            temperature: 0.5, 
            topK: 40,
            topP: 0.9,
         }
    });

    const rawText = response.text;
    let adviceType: AdviceType;
    let fullAdviceMessage = rawText.trim();
    let adviceText = ""; 
    let detailedMessage: string | undefined = undefined;

    if (fullAdviceMessage.toUpperCase().startsWith("COMPRAR:")) {
        adviceType = AdviceType.BUY;
        fullAdviceMessage = fullAdviceMessage.substring("COMPRAR:".length).trim();
    } else if (fullAdviceMessage.toUpperCase().startsWith("VENDER:")) {
        adviceType = AdviceType.SELL;
        fullAdviceMessage = fullAdviceMessage.substring("VENDER:".length).trim();
    } else if (fullAdviceMessage.toUpperCase().startsWith("MANTENER:")) {
        adviceType = AdviceType.HOLD;
        fullAdviceMessage = fullAdviceMessage.substring("MANTENER:".length).trim();
    } else {
        console.warn("Gemini response did not start with expected keyword. Full response:", rawText);
        adviceType = AdviceType.INFO; // Fallback
    }

    const separatorIndex = fullAdviceMessage.indexOf(ADVANCED_DETAILS_SEPARATOR);

    if (separatorIndex !== -1) {
        adviceText = fullAdviceMessage.substring(0, separatorIndex).trim();
        detailedMessage = fullAdviceMessage.substring(separatorIndex + ADVANCED_DETAILS_SEPARATOR.length).trim();
    } else {
        adviceText = fullAdviceMessage;
    }
    
    if (!adviceText && rawText) { // Ensure adviceText is not empty if rawText has content
        adviceText = "services.gemini.adviceUnparsableSummary"; 
        if(adviceType === AdviceType.INFO && !rawText.toUpperCase().startsWith("INFO:")) { 
             adviceText = rawText.trim(); 
        }
    }
    // If adviceText is empty after all this and it was INFO due to unexpected keyword, use the rawText.
    if (!adviceText && adviceType === AdviceType.INFO && rawText) {
        adviceText = rawText;
    }


    return { adviceText, detailedMessage, adviceType, rawGeminiResponse: rawText };

  } catch (error) {
    console.error("Error fetching advice from Gemini API:", error);
    let errorMessageKey = "services.gemini.adviceErrorFetching";
    let errorDetails = "";
    if (error instanceof Error && 'message' in error) {
        errorDetails = error.message;
    }
    // The UI will use t(errorMessageKey, { cryptoName: crypto.name, details: errorDetails })
    return {
        adviceText: `${errorMessageKey}:{ "details": "${errorDetails}" }`, // Pass details for interpolation
        adviceType: AdviceType.INFO
    };
  }
};


export const analyzeCryptoTweets = async (
  cryptoName: string,
  tweetDataItems: string[] 
): Promise<CryptoTweetAnalysis | null> => {
  if (!ai) {
    console.warn("Gemini AI client not initialized. API key might be missing.");
    return {
      sentiment: 'Desconocido',
      narratives: [],
      summary: "services.gemini.tweetAnalysisUnavailable",
    };
  }

  if (tweetDataItems.every(item => !item.trim() || item.startsWith('URL vacía'))) { // "URL vacía" comes from CryptoXView
    return {
      sentiment: 'Desconocido',
      narratives: [],
      summary: "services.gemini.tweetAnalysisNoValidData",
    };
  }

  const formattedTweetInputs = tweetDataItems
    .map((item, index) => {
        if (item.startsWith('FALLO_DIRECTO_FETCH_URL:')) {
            return `Tweet ${index + 1} (URL): "${item.replace('FALLO_DIRECTO_FETCH_URL:', '')}" (Nota: El contenido no pudo ser obtenido directamente, analiza basado en la URL y tu conocimiento general).`;
        } else if (item.startsWith('Error') || item.startsWith('Tweet no encontrado') || item.startsWith('URL inválida') || item.startsWith('Excepción') || item.startsWith('Contenido del tweet no pudo ser extraído') || item.startsWith('No se pudo obtener el HTML') || item.startsWith('Límite de peticiones alcanzado')) {
             // These error messages are already localized or specific from CryptoXView, pass them as is
            return `Tweet ${index + 1} (Error de Carga): "${item}" (Nota: No se pudo obtener el contenido de este tweet debido a un error. Ignora este item para el análisis de contenido específico, pero considera su impacto si múltiples tweets fallan).`;
        }
        return `Tweet ${index + 1} (Texto): "${item}"`;
    })
    .join("\n---\n");

  const prompt = `
    Eres un analista experto en redes sociales, especializado en el sentimiento y las narrativas del mercado de criptomonedas.
    Analiza los siguientes datos de tweets recientes sobre ${cryptoName}. Cada item es o bien el texto de un tweet, una URL a un tweet (si el contenido directo no se pudo obtener), o un mensaje de error de carga.

    Datos de Tweets:
    ${formattedTweetInputs}

    Tu tarea es:
    1.  Para cada item que sea TEXTO de un tweet: Analiza su contenido directamente.
    2.  Para cada item que sea una URL de un tweet (marcado como "(URL)"): Infiere el posible contenido, tono y tema de ese tweet basándote en la URL y tu conocimiento general sobre las discusiones de ${cryptoName} en X.com.
    3.  Para cada item que sea un ERROR DE CARGA: Simplemente toma nota de que el contenido no estuvo disponible. Si la mayoría de los tweets son errores, indícalo en tu resumen.
    4.  Considerando todos los tweets cuyo contenido pudiste analizar o inferir, determina el sentimiento general predominante sobre ${cryptoName}. El sentimiento debe ser uno de: Positivo, Negativo, Neutral, Mixto.
    5.  Identifica las narrativas o temas de discusión clave que emergen de los tweets analizables/inferibles. Lista de 2 a 4 narrativas principales.
    6.  Proporciona un resumen conciso (2-3 frases) de tus hallazgos generales sobre ${cryptoName} basado en estos datos. Si hubo muchos errores de carga, menciónalo.

    Formato de Respuesta OBLIGATORIO (JSON):
    Debes responder con un objeto JSON que tenga la siguiente estructura exacta:
    {
      "sentiment": "Positivo" | "Negativo" | "Neutral" | "Mixto" | "Desconocido",
      "narratives": ["Narrativa 1", "Narrativa 2", ...],
      "summary": "Resumen conciso de los hallazgos."
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.4, 
        topK: 35,
        topP: 0.90,
        responseMimeType: "application/json",
      }
    });
    
    const rawText = response.text.trim();
    let parsedData: CryptoTweetAnalysis;

    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = rawText.match(fenceRegex);
    const jsonStr = match && match[2] ? match[2].trim() : rawText;
    
    try {
        parsedData = JSON.parse(jsonStr);
        if (typeof parsedData.sentiment !== 'string' || !Array.isArray(parsedData.narratives) || typeof parsedData.summary !== 'string') {
            console.error( "AI JSON response does not have the expected structure.", parsedData);
            throw new Error("services.gemini.tweetAnalysisJsonStructureError");
        }
        return { ...parsedData, rawResponse: rawText };
    } catch (parseError) {
        console.error("Error parsing Gemini JSON response for tweet analysis:", parseError, "Received response:", rawText);
        return {
            sentiment: 'Desconocido',
            narratives: ["services.gemini.tweetAnalysisJsonParseError"],
            summary: `services.gemini.tweetAnalysisUnparsableResponse:{ "responsePreview": "${rawText.substring(0,150)}" }`,
            rawResponse: rawText
        };
    }

  } catch (error) {
    console.error(`Error analyzing tweets for ${cryptoName} with Gemini:`, error);
    let errorMessageKey = "services.gemini.tweetAnalysisGenericError";
    let errorDetails = "";
    if (error instanceof Error && 'message' in error) {
      errorDetails = error.message;
    }
    return {
      sentiment: 'Desconocido',
      narratives: [],
      summary: `${errorMessageKey}:{ "cryptoName": "${cryptoName}", "details": "${errorDetails}" }`,
    };
  }
};