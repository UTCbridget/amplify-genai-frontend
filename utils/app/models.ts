import { Model, ModelID, Models } from "@/types/model";
import cloneDeep from 'lodash/cloneDeep';

export const MINIMAL_AVAILABLE_MODELS:Model[] = [Models[ModelID.GPT_4o_MINI],  Models[ModelID.GPT_4o_AZ],  Models[ModelID.CLAUDE_3_HAIKU], Models[ModelID.CLAUDE_3_5_SONNET] ];

export const filterModels = (models: Model[], modelOptions: { [key: string]: boolean }): Model[] => {
    const minimalModelIds = new Set(cloneDeep(MINIMAL_AVAILABLE_MODELS).map(model => model.id));
    const includedModels = cloneDeep(MINIMAL_AVAILABLE_MODELS);
  
    // Add models based on the options, ensuring they are not already included
    models.forEach(model => {
      if (!minimalModelIds.has(model.id) &&
          ((modelOptions.allClaude && model.id.startsWith('anthropic')) ||
           (modelOptions.allMistral && model.id.startsWith('mistral')) ||
           (modelOptions.allOpenAI && model.id.startsWith('gpt')))) {
        includedModels.push(model);
      }
    });
  
    // Convert the Set back to an array
    return includedModels.sort((a, b) => {
        // Define a custom sort order based on the model ID prefixes
        const sortOrder = ['gpt', 'anthropic', 'mistral'];
        const getIndex = (id: string) => sortOrder.findIndex((prefix) => id.startsWith(prefix));
        const indexA = getIndex(a.id);
        const indexB = getIndex(b.id);
    
        if (indexA !== indexB) {
          return indexA - indexB;
        }
    
        // If both models have the same prefix, sort by ID
        return a.id.localeCompare(b.id);
      });
  };