import * as functions from "firebase-functions";
import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  Content,
  Modality,
  GenerateContentRequest,
} from "@google/genai";
import * as cors from "cors";

const corsHandler = cors({ origin: true });

// Execute no terminal: firebase functions:config:set gemini.key="SUA_CHAVE_API_AQUI"
const API_KEY = functions.config().gemini.key;
const DEFAULT_MODEL_NAME = "gemini-2.5-flash";

/**
 * Higieniza as ferramentas para a API de texto, removendo propriedades personalizadas
 * como 'isEnabled' e 'scheduling' que não são suportadas.
 * @param rawTools As ferramentas brutas recebidas do cliente.
 * @returns Um array de ferramentas higienizado ou undefined.
 */
const sanitizeToolsForTextApi = (rawTools: any[] | undefined): any[] | undefined => {
    if (!rawTools || rawTools.length === 0) {
        return undefined;
    }
    const sanitizedToolSets = rawTools.map(toolSet => {
        if (toolSet.googleSearch) {
            return toolSet;
        }
        if (toolSet.functionDeclarations) {
            // Filtra ferramentas ativadas e remove propriedades não suportadas pela API
            const sanitizedDeclarations = toolSet.functionDeclarations
                .filter((d: any) => d.isEnabled)
                .map((d: any) => ({
                    name: d.name,
                    description: d.description,
                    parameters: d.parameters,
                }));
            if (sanitizedDeclarations.length > 0) {
                return { functionDeclarations: sanitizedDeclarations };
            }
        }
        return null;
    }).filter(Boolean); // Remove quaisquer entradas nulas

    return sanitizedToolSets.length > 0 ? sanitizedToolSets : undefined;
};

export const geminiVoiceStreamProxy = functions.https.onRequest(
  (req: functions.https.Request, res: functions.Response) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      if (!API_KEY) {
        functions.logger.error("A chave da API do Gemini não foi configurada.");
        res.status(500).send("API Key not configured.");
        return;
      }

      try {
        const { history, prompt, systemInstruction, model, config, tools } = req.body;

        if (!prompt || typeof prompt !== "string") {
            res.status(400).send("O prompt do usuário é inválido.");
            return;
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const contents: Content[] = [
          ...(history || []),
          { role: 'user', parts: [{ text: prompt }] },
        ];

        const sanitizedTools = sanitizeToolsForTextApi(tools);

        // Constrói a requisição no formato correto esperado pelo SDK
        const genAIRequest: GenerateContentRequest = {
            model: model || DEFAULT_MODEL_NAME,
            contents: contents,
            tools: sanitizedTools,
            systemInstruction: systemInstruction,
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
            ],
            generationConfig: {
                temperature: 0.9,
                topK: 1,
                ...(config || {}), // Espalha a configuração do cliente (ex: thinkingConfig)
            },
        };

        const result = await ai.models.generateContentStream(genAIRequest);

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Transfer-Encoding", "chunked");

        for await (const chunk of result) {
          if (chunk && chunk.text) {
            res.write(chunk.text);
          }
        }

        res.end();
      } catch (error) {
        functions.logger.error("Erro na API Gemini:", error);
        res.status(500).send("Internal Server Error");
      }
    });
  },
);

export const getTTSAudio = functions.https.onRequest(
  (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        if (!API_KEY) {
            functions.logger.error("A chave da API do Gemini não foi configurada.");
            res.status(500).send("API Key not configured.");
            return;
        }
        try {
            const { text, voice } = req.body;
            if (!text) {
                res.status(400).send("O texto para TTS é obrigatório.");
                return;
            }
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                res.status(200).json({ audioContent: base64Audio });
            } else {
                res.status(500).send("Falha ao gerar o áudio.");
            }
        } catch (error) {
            functions.logger.error("Erro na API TTS do Gemini:", error);
            res.status(500).send("Internal Server Error");
        }
    });
  }
);
