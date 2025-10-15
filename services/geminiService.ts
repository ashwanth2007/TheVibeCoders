import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface File {
    path: string;
    content: string;
}

const MULTI_FILE_GENERATION_INSTRUCTION = `You are an expert web developer. Your task is to generate a complete web application project structure with multiple files based on the user's prompt, which may include an image for context. You must output a single JSON object containing an array of file objects.

**Requirements:**
1.  **JSON Output:** Your entire response MUST be a single, valid JSON object in the format: \`{ "files": [ { "path": "path/to/file.ext", "content": "file content" } ] }\`. Do not include any markdown formatting.
2.  **Mandatory Project Structure:** You MUST create the following files for every new project:
    - \`index.html\`: The main HTML file.
    - \`style.css\`: The main stylesheet.
    - \`script.js\`: The main JavaScript file.
    - \`assets/.gitkeep\`: An empty file to ensure the 'assets' directory is created.
3.  **File Linking:** The \`index.html\` file MUST correctly link to \`style.css\` and \`script.js\` using relative paths (e.g., \`<link rel="stylesheet" href="style.css">\` and \`<script src="script.js" defer></script>\`).
4.  **Content Distribution:**
    - All HTML structure goes into \`index.html\`.
    - All CSS styling goes into \`style.css\`.
    - All JavaScript functionality goes into \`script.js\`.
5.  **Styling:** Do NOT use Tailwind CSS. All styles must be written in the \`style.css\` file.
6.  **File Paths:** Use forward slashes (/) for file paths.
7.  **Completeness:** The generated files should be complete and ready to run. The user prompt should be implemented across these files.`;

const EDITING_INSTRUCTION = `You are an expert web developer. Your task is to modify the provided web application files based on the user's request, which may include an image for context. You must output a single JSON object containing the complete, updated array of all project files.

**Requirements:**
1.  **JSON Output:** Your entire response MUST be a single, valid JSON object in the format: \`{ "files": [ { "path": "path/to/file.ext", "content": "file content" } ] }\`. Do not add any commentary or markdown formatting.
2.  **Context:** You will be given the current file structure and content as a JSON string.
3.  **Apply Changes:** Apply the user's requested changes to the appropriate files. You might need to add, delete, or modify files.
4.  **Return All Files:** You MUST return the complete, updated list of all files in the project, not just the ones you changed.
5.  **Styling:** The project uses a separate 'style.css' file for styling. Do not add Tailwind CSS. Modify 'style.css' for style changes.`;

const PROMPT_ENHANCEMENT_INSTRUCTION = `You are a prompt engineering expert. Your task is to rewrite the user's web development change request to be clearer, more detailed, and more effective for an AI agent to understand. Focus on actionable instructions. Respond only with the rewritten prompt, without any preamble or explanation.`;

const fileSchema = {
    type: Type.OBJECT,
    properties: {
        files: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    path: { type: Type.STRING },
                    content: { type: Type.STRING },
                },
                required: ['path', 'content'],
            },
        },
    },
    required: ['files'],
};

export const enhancePrompt = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: PROMPT_ENHANCEMENT_INSTRUCTION,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        throw new Error("Failed to communicate with the AI model for prompt enhancement.");
    }
};

export const generateWebApp = async (prompt: string, baseFiles?: File[], image?: { base64: string; mimeType: string }): Promise<File[]> => {
    try {
        const isEditing = !!baseFiles && baseFiles.length > 0;

        let systemInstruction: string;
        let textPrompt: string;

        if (isEditing) {
            systemInstruction = EDITING_INSTRUCTION;
            textPrompt = `Here is the current project structure as a JSON object:\n\n${JSON.stringify({ files: baseFiles }, null, 2)}\n\nNow, please apply this change: "${prompt}"`;
        } else {
            systemInstruction = MULTI_FILE_GENERATION_INSTRUCTION;
            textPrompt = prompt;
        }

        const textPart = { text: textPrompt };
        // FIX: Explicitly type the 'parts' array to allow a union of text and image parts,
        // preventing a TypeScript error when adding the image part later.
        const parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [textPart];

        if (image) {
            const imagePart = {
                inlineData: {
                    data: image.base64,
                    mimeType: image.mimeType,
                },
            };
            parts.unshift(imagePart); // Put image first for model context
        }
        
        const contents = { parts };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: fileSchema,
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        if (result.files && Array.isArray(result.files)) {
             // Ensure the assets folder file is present if the AI forgets
            if (!isEditing && !result.files.some((f: File) => f.path.startsWith('assets/'))) {
                result.files.push({ path: 'assets/.gitkeep', content: '' });
            }
            return result.files;
        }
        throw new Error("Invalid JSON structure received from AI.");

    } catch (error) {
        console.error("Error generating web app:", error);
        throw new Error("Failed to communicate with the AI model.");
    }
};