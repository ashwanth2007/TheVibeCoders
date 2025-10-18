import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface File {
    path: string;
    content: string;
}

export interface Suggestion {
    title: string;
    detailedPrompt: string;
}

const MULTI_FILE_GENERATION_INSTRUCTION = `You are an expert web developer. Your task is to generate a complete web application project structure with multiple files based on the user's prompt. You must output a single JSON object containing an array of file objects.

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

const EDITING_INSTRUCTION = `You are an expert web developer. Your task is to modify the provided web application files based on the user's request. You must output a single JSON object containing the complete, updated array of all project files.

**Requirements:**
1.  **JSON Output:** Your entire response MUST be a single, valid JSON object in the format: \`{ "files": [ { "path": "path/to/file.ext", "content": "file content" } ] }\`. Do not add any commentary or markdown formatting.
2.  **Context:** You will be given the current file structure and content as a JSON string.
3.  **Element-Specific Edits:** The user may provide a specific element context (a CSS selector and its current HTML) to target their change. If this context is provided in the prompt, prioritize your modifications on that specific element and its related styles. You may still need to modify other files (like CSS or JS) to fully implement the change.
4.  **Apply Changes:** Apply the user's requested changes to the appropriate files. You might need to add, delete, or modify files.
5.  **Return All Files:** You MUST return the complete, updated list of all files in the project, not just the ones you changed.
6.  **Styling:** The project uses a separate 'style.css' file for styling. Do not add Tailwind CSS. Modify 'style.css' for style changes.`;

const PROMPT_ENHANCEMENT_INSTRUCTION = `You are a prompt engineering expert. Your task is to rewrite the user's web development change request to be clearer, more detailed, and more effective for an AI agent to understand. Focus on actionable instructions. Respond only with the rewritten prompt, without any preamble or explanation.`;

const SUGGESTION_GENERATION_INSTRUCTION = `You are a world-class UI/UX designer and expert web developer. Your task is to analyze the provided web application files and suggest 5 creative, actionable improvements.

**Requirements:**
1.  **JSON Output:** Your entire response MUST be a single, valid JSON object in the format: \`{ "suggestions": [ { "title": "Brief suggestion title", "detailedPrompt": "A detailed, actionable prompt for the change." } ] }\`. Do not add any commentary or markdown formatting.
2.  **Context:** You will be given the current file structure and content as a JSON string.
3.  **High-Quality Suggestions:** Provide suggestions that would genuinely improve the app's functionality, aesthetics, or user experience. Consider adding animations, improving accessibility, adding new features, or refining the existing layout.
4.  **Specificity:** Suggestions must be hyper-specific to the provided code. Avoid generic advice. For a to-do list, don't just say "Add features"; say "Implement a feature to categorize tasks with color-coded labels."
5.  **Title:** The 'title' for each suggestion must be a very short, concise phrase (3-5 words) that summarizes the improvement.
6.  **Detailed Prompt:** The 'detailedPrompt' should be a full, clear, and actionable request that could be given to another AI to implement the change. It should be 2-3 sentences long.
7.  **Quantity:** Provide exactly 5 suggestions.`;

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

const suggestionSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: 'A very short, concise phrase (3-5 words) that summarizes the improvement.',
                    },
                    detailedPrompt: {
                        type: Type.STRING,
                        description: 'A full, clear, and actionable request (2-3 sentences) to implement the change.',
                    },
                },
                required: ['title', 'detailedPrompt'],
            },
            description: 'An array of exactly 5 suggestion objects.'
        }
    },
    required: ['suggestions']
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

export const generateWebApp = async (prompt: string, baseFiles?: File[]): Promise<File[]> => {
    try {
        const isEditing = !!baseFiles && baseFiles.length > 0;

        let systemInstruction: string;
        let textPrompt: string;

        if (isEditing) {
            systemInstruction = EDITING_INSTRUCTION;
            // The prompt from App.tsx now contains the full context (element selection, user request, etc.)
            // We just need to add the project files.
            textPrompt = `Here is the current project structure as a JSON object:\n\n${JSON.stringify({ files: baseFiles }, null, 2)}\n\n${prompt}`;
        } else {
            systemInstruction = MULTI_FILE_GENERATION_INSTRUCTION;
            textPrompt = prompt;
        }

        const textPart = { text: textPrompt };
        const parts = [textPart];
        
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

export const generateSuggestions = async (files: File[]): Promise<Suggestion[]> => {
    try {
        const textPrompt = `Here is the current project structure as a JSON object:\n\n${JSON.stringify({ files }, null, 2)}\n\nPlease provide 5 improvement suggestions based on this code.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: textPrompt }] },
            config: {
                systemInstruction: SUGGESTION_GENERATION_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: suggestionSchema,
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result.suggestions && Array.isArray(result.suggestions)) {
            return result.suggestions;
        }

        throw new Error("Invalid JSON structure for suggestions received from AI.");
    } catch (error) {
        console.error("Error generating suggestions:", error);
        throw new Error("Failed to communicate with the AI model for suggestions.");
    }
};