import { StateGraph } from "@langchain/langgraph";
import { Document } from "@langchain/core/documents";

/**
 * Represents the state of our graph.
 */
export type GraphState = {
  question: string;
  generation: string;
  documents: [Document];
  generationStyle: string;
};

const graphState = {
  question: {
    value: null,
  },
  generation: {
    value: null,
  },
  documents: {
    value: null,
  },
  generationStyle: {
    value: null,
  },
};

const getStateWorkflow = () => {
  const workflow = new StateGraph<GraphState>({
    channels: graphState,
  });

  return workflow;
};

export default getStateWorkflow;
