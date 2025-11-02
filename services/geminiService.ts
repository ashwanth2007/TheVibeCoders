import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

export const initializeAi = (apiKey: string | undefined | null) => {
    if (apiKey) {
        try {
            // Re-initialize the client with the new key
            ai = new GoogleGenAI({ apiKey });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI with provided key:", e);
            ai = null; // Set to null if initialization fails
        }
    } else {
        // Clear the client if no key is provided
        ai = null;
    }
};

export interface File {
    path: string;
    content: string;
}

export interface Suggestion {
    title: string;
    detailedPrompt: string;
}

export interface GenerationResult {
    plan: string;
    files: File[];
}

const handleGeminiError = (error: any, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    // Make error checking more robust by looking at the message property if it exists.
    const errorString = (error?.message || error.toString()).toLowerCase();

    // Broaden the check for API key-related errors to provide better user feedback.
    if (errorString.includes("api key") || errorString.includes("api_key") || errorString.includes("permission denied") || errorString.includes("authentication failed")) {
        return new Error("Your Gemini API Key is invalid, missing required permissions, or not entered correctly. Please check it in Settings and try again.");
    }
    
    // Provide a more helpful generic error message.
    return new Error(`Failed to communicate with the AI model for ${context}. This could be a temporary network issue or a problem with the service.`);
};

const MULTI_FILE_GENERATION_INSTRUCTION = `You are an expert web developer. Your task is to generate a complete web application project structure with multiple files based on the user's prompt. You must output a single JSON object containing a "plan" string and an array of file objects.

**Requirements:**
1.  **JSON Output:** Your entire response MUST be a single, valid JSON object in the format: \`{ "plan": "A summary of the app to be created.", "files": [ { "path": "path/to/file.ext", "content": "file content" } ] }\`. Do not include any markdown formatting.
2.  **Plan First:** The 'plan' property must contain a brief, one-sentence summary of the web application you are about to create.
3.  **Context from Attachments:** The user's prompt may be supplemented with context from attached files. For images, an AI-generated description is provided. You MUST use this contextual information to inform your design choices (e.g., color schemes, background images, content).
4.  **Mandatory Project Structure:** You MUST create the following files for every new project:
    - \`index.html\`: The main HTML file.
    - \`style.css\`: The main stylesheet.
    - \`script.js\`: The main JavaScript file.
    - \`assets/.gitkeep\`: An empty file to ensure the 'assets' directory is created.
5.  **File Linking:** The \`index.html\` file MUST correctly link to \`style.css\` and \`script.js\` using relative paths (e.g., \`<link rel="stylesheet" href="style.css">\` and \`<script src="script.js" defer></script>\`).
6.  **Content Distribution:**
    - All HTML structure goes into \`index.html\`.
    - All CSS styling goes into \`style.css\`.
    - All JavaScript functionality goes into \`script.js\`.
7.  **Styling:** Do NOT use Tailwind CSS. All styles must be written in the \`style.css\` file.
8.  **File Paths:** Use forward slashes (/) for file paths.
9.  **Completeness:** The generated files should be complete and ready to run. The user prompt should be implemented across these files.`;

const EDITING_INSTRUCTION = `You are an expert web developer. Your task is to modify the provided web application files based on the user's request. You must output a single JSON object containing a "plan" string and the complete, updated array of all project files.

**Requirements:**
1.  **JSON Output:** Your entire response MUST be a single, valid JSON object in the format: \`{ "plan": "A step-by-step summary of the changes.", "files": [ { "path": "path/to/file.ext", "content": "file content" } ] }\`. Do not add any commentary or markdown formatting.
2.  **Plan First:** The 'plan' property must contain a concise, step-by-step summary of the changes you are about to make based on the user's request. This plan will be shown to the user.
3.  **Context:** You will be given the current file structure and content as a JSON string. The user's prompt may also be supplemented with text and image attachments. For images, an AI-generated description is provided. You MUST use all this contextual information to accurately implement the user's request.
4.  **Element-Specific Edits:** The user may provide a specific element context (a CSS selector and its current HTML) to target their change. If this context is provided in the prompt, prioritize your modifications on that specific element and its related styles. You may still need to modify other files (like CSS or JS) to fully implement the change.
5.  **Apply Changes:** Apply the user's requested changes to the appropriate files. You might need to add, delete, or modify files.
6.  **Return All Files:** You MUST return the complete, updated list of all files in the project, not just the ones you changed.
7.  **Styling:** The project uses a separate 'style.css' file for styling. Do not add Tailwind CSS. Modify 'style.css' for style changes.`;

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

const DISCUSS_INSTRUCTION = `You are a friendly and helpful AI assistant. Your main goal is to help users understand their web application project by answering their questions in a simple, clear, and concise way.

**Core Principles:**
1.  **Simplicity First:** Your answers must be short, speedy, and crisp. Avoid overly technical jargon. Explain concepts as you would to someone who is smart but not necessarily a programming expert.
2.  **Be a Helpful Guide:** When a user asks about an error or a problem, don't just explain the issue. Provide 2-3 actionable, high-level suggestions or possible solutions they could try.
3.  **Context is Key:** You will be given the complete project files. Use this context to inform your answers.

**How to Respond:**
- **For General Questions** (e.g., "What does this app do?", "What's the main color?"): Provide a high-level, simple answer without referencing specific code.
- **For Technical Questions** (e.g., "What's in script.js?", "How does the button click work?"): You can be more detailed and reference the codebase. If you include code snippets, keep them short and relevant to the question.
- **Your Role:** You are a discussant, not a coder. Do NOT suggest code changes or generate new code unless the user explicitly asks for an example of how to fix something. Your primary purpose is to explain and guide.
- **Formatting:** Use markdown for your responses. Keep paragraphs short. Use lists for suggestions.`;

const fileSchema = {
    type: Type.OBJECT,
    properties: {
        plan: {
            type: Type.STRING,
            description: "A concise, step-by-step summary of the changes being made or the application being created."
        },
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
    required: ['plan', 'files'],
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

const processFile = async (file: globalThis.File): Promise<{ imagePart?: any; textContent?: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;

        if (file.type.startsWith('image/')) {
            reader.onloadend = () => {
                const base64Data = (reader.result as string).split(',')[1];
                resolve({
                    imagePart: {
                        inlineData: {
                            mimeType: file.type,
                            data: base64Data,
                        },
                    },
                });
            };
            reader.readAsDataURL(file);
        } else {
            // Treat other file types as text and extract their content.
            reader.onloadend = () => {
                const text = reader.result as string;
                const content = `\n\n--- Attached File Context: ${file.name} ---\n${text}\n--- End of File Context ---`;
                resolve({ textContent: content });
            };
            reader.readAsText(file);
        }
    });
};

const describeImage = async (imagePart: any): Promise<string> => {
    if (!ai) {
        throw new Error("Gemini API Key not configured. Please add it in Settings.");
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Describe this image in detail for a web developer. What are the main subjects, colors, and overall mood? The developer will use this description as inspiration for designing a web page. For example, if it's a picture of a forest, the developer might use it as a background image or draw colors from it for a theme." },
                    imagePart
                ]
            }
        });
        return response.text.trim();
    } catch (error: any) {
        console.error("Error describing image:", error);
        const errorString = error.toString();
        if (errorString.includes("API key not valid") || errorString.includes("permission denied") || errorString.includes("API_KEY_INVALID")) {
            return "Could not get an AI description: Invalid API Key.";
        }
        return "Could not get an AI description for this image.";
    }
};


export const enhancePrompt = async (prompt: string): Promise<string> => {
    if (!ai) {
        throw new Error("Gemini API Key not configured. Please add it in Settings.");
    }
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
        throw handleGeminiError(error, "prompt enhancement");
    }
};

export const generateWebApp = async (prompt: string, baseFiles?: File[], attachments: globalThis.File[] = []): Promise<GenerationResult> => {
    if (!ai) {
        throw new Error("Gemini API Key not configured. Please add it in Settings.");
    }
    try {
        const isEditing = !!baseFiles && baseFiles.length > 0;
        let modelName: string;

        // Model Selection Logic: Use a faster model for simple edits to improve response time.
        if (isEditing) {
            // A simple heuristic for complexity is the prompt length.
            // Short, text-only prompts are likely simple changes.
            const PROMPT_COMPLEXITY_THRESHOLD = 200; // characters
            if (prompt.length < PROMPT_COMPLEXITY_THRESHOLD && attachments.length === 0) {
                modelName = 'gemini-2.5-flash';
            } else {
                modelName = 'gemini-2.5-pro';
            }
        } else {
            // For new project generation, always use the more powerful model for a better foundation.
            modelName = 'gemini-2.5-pro';
        }

        const parts: any[] = [];
        let combinedPrompt = prompt;
        let attachmentContextInfo = ""; // This will hold all descriptions and text content.

        if (attachments.length > 0) {
            const processedAttachments = await Promise.all(attachments.map(processFile));
            
            // An array to hold promises for descriptions, to run them in parallel
            const descriptionPromises: Promise<string>[] = [];

            // First, handle all text files synchronously and collect image parts
            for (const [index, processed] of processedAttachments.entries()) {
                if (processed.textContent) {
                    attachmentContextInfo += processed.textContent;
                }
                if (processed.imagePart) {
                    parts.push(processed.imagePart);
                    // Push a promise that resolves to the description string
                    descriptionPromises.push(
                        describeImage(processed.imagePart).then(description => 
                            `\n\n--- Attached Image Context (${attachments[index].name}) ---\n${description}\n--- End of Image Context ---`
                        )
                    );
                }
            }

            // Wait for all image descriptions to be generated
            const imageDescriptions = await Promise.all(descriptionPromises);
            
            // Prepend image descriptions to the context string
            attachmentContextInfo = imageDescriptions.join('') + attachmentContextInfo;
        }


        let systemInstruction: string;
        let textPrompt: string;

        // Prepend the context to the prompt
        combinedPrompt = `${prompt}${attachmentContextInfo}`;

        if (isEditing) {
            systemInstruction = EDITING_INSTRUCTION;
            textPrompt = `Here is the current project structure as a JSON object:\n\n${JSON.stringify({ files: baseFiles }, null, 2)}\n\n${combinedPrompt}`;
        } else {
            systemInstruction = MULTI_FILE_GENERATION_INSTRUCTION;
            textPrompt = combinedPrompt;
        }

        const textPart = { text: textPrompt };
        parts.unshift(textPart); // The prompt now contains the descriptions
        
        const contents = { parts };

        const response = await ai.models.generateContent({
            model: modelName, // Using the dynamically selected model
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: fileSchema,
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        if (result.plan && result.files && Array.isArray(result.files)) {
             // Ensure the assets folder file is present if the AI forgets
            if (!isEditing && !result.files.some((f: File) => f.path.startsWith('assets/'))) {
                result.files.push({ path: 'assets/.gitkeep', content: '' });
            }
            return result;
        }
        throw new Error("Invalid JSON structure received from AI.");

    } catch (error) {
        throw handleGeminiError(error, "web app generation");
    }
};

export const generateSuggestions = async (files: File[]): Promise<Suggestion[]> => {
    if (!ai) {
        // Silently fail for suggestions, as it's a non-critical feature.
        console.log("Skipping suggestions: Gemini API Key not configured.");
        return [];
    }
    try {
        const textPrompt = `Here is the current project structure as a JSON object:\n\n${JSON.stringify({ files }, null, 2)}\n\nPlease provide 5 improvement suggestions based on this code.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: textPrompt,
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
        // Return empty array on failure to not break the UI
        return [];
    }
};

export const discussCode = async (prompt: string, files: File[]): Promise<string> => {
    if (!ai) {
        throw new Error("Gemini API Key not configured. Please add it in Settings.");
    }
    try {
        const textPrompt = `Here is the current project structure as a JSON object:\n\n${JSON.stringify({ files }, null, 2)}\n\nHere is my question: ${prompt}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: textPrompt,
            config: {
                systemInstruction: DISCUSS_INSTRUCTION,
            }
        });

        return response.text.trim();
    } catch (error) {
        throw handleGeminiError(error, "discussion");
    }
};