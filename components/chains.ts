import {
  JsonOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";
import { grader_prompt, rag_prompt, router_prompt } from "./prompts";

export const getRagChain = (llm) => {
  // RAG Chain
  return rag_prompt.pipe(llm).pipe(new StringOutputParser());
};

export const getRetrievalGraderChain = (llm) => {
  // RETRIEVAL GRADER Chain
  return grader_prompt.pipe(llm);
};

export const getQuestionRouterChain = (llm) => {
  // ROUTER Chain
  return router_prompt.pipe(llm).pipe(new JsonOutputParser());
};
