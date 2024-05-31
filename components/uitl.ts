import { type GraphState } from "./appStateGraph";
import getRetriever from "./retriever";
import {
  getRagChain,
  getQuestionRouterChain,
  getRetrievalGraderChain,
} from "./chains";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { type DocumentInterface, Document } from "@langchain/core/documents";
import { FireCrawlLoader } from "langchain/document_loaders/web/firecrawl";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import chalk from "chalk";

const llm = new ChatOllama({
  model: "llama3",
  temperature: 0,
});

/**
 * Retrieve from documents
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
export async function retrieveFromDocument(state: GraphState) {
  console.log(chalk.blue("---- RETRIEVE FROM DOCUMENT ----"));
  // console.log(state);
  const question = state.question;
  const retriever = await getRetriever();
  const documents = await retriever
    .withConfig({ runName: "FetchRelevantDocuments" })
    .invoke(question);
  return {
    ...state,
    documents,
    question,
  };
}

/**
 * Generate Answer based on context
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
export async function generateAnswerFromContext(state: GraphState) {
  console.log(chalk.blue("---- GENERATE ANSWER FROM CONTEXT ----"));
  const documents = state.documents;
  const question = state.question;

  const formattedDocs = documents
    .map((doc: any) => doc.pageContent)
    .join("\n\n");

  const ragChain = getRagChain(llm);
  const generation = await ragChain.invoke({
    context: formattedDocs,
    question,
  });

  return {
    ...state,
    documents,
    question,
    generation,
  };
}

/**
 * Routes Question to right retriever
 *
 * @param {GraphState} state The current state of the graph.
 * @returns {Promise<GraphState>} The new state object.
 */
export async function questionRouter(state: GraphState) {
  console.log(chalk.blue("---- ROUTE QUESTION TO CORRECT RETRIEVER ----"));
  const question = state["question"];
  const questionRouter = getQuestionRouterChain(llm);
  const source = await questionRouter.invoke({ question: question });

  if (source["datasource"] == "web_search") {
    return {
      ...state,
      generationStyle: "websearch",
    };
  } else {
    return {
      ...state,
      generationStyle: "vectorstore",
    };
  }
}

/**
 * Grade document genertaed for relevance
 *
 * @param {GraphState} state The current state of the graph.
 * @returns {Promise<GraphState>} The new state object.
 */
export async function gradeGeneratedDocuments(state: GraphState) {
  console.log(chalk.blue("---- CHECK RELEVANCE AND GRADE DOCUMENT ----"));
  const documents = state.documents;
  const question = state.question;

  const filteredDocs: Array<DocumentInterface> = [];
  for await (const doc of documents) {
    const retRievalGrader = getRetrievalGraderChain(llm);
    const grade: { content?: string } = await retRievalGrader.invoke({
      document: doc.pageContent,
      question,
    });
    const score = JSON.parse(grade.content).score;
    if (score === "yes") {
      console.log(chalk.magenta("---GRADE: DOCUMENT RELEVANT---"));
      filteredDocs.push(doc);
    } else {
      console.log(chalk.magenta("---GRADE: DOCUMENT NOT RELEVANT---"));
    }
  }

  return {
    ...state,
    documents: filteredDocs,
  };
}

/**
 * Web search using Tavily API.
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
export async function webSearch(state: GraphState) {
  console.log(chalk.blue("---- SEARCH WEB FOR ANSWER ----"));
  const question = state.question;
  const documents = state.documents;

  const tool = new TavilySearchResults({
    maxResults: 2,
  });
  const searchResultsJson = await tool.invoke(question);
  const searchResults = JSON.parse(searchResultsJson)[0];

  // const loader = new CheerioWebBaseLoader(searchResults.url);
  // const docs = await loader.load();

  const loader = new FireCrawlLoader({
    url: searchResults.url, // The URL to scrape
    apiKey: process.env.FIRECRAWL_API_KEY,
    mode: "scrape",
    params: {},
  });
  const docs = await loader.load();

  return {
    ...state,
    documents: [docs],
  };
}

/**
 * Determines whether to use the generated docs to generate final answer or search web.
 *
 * @param {GraphState} state The current state of the graph.
 * @returns {String} Returns "searchWeb" or "useLLm"
 */
export function decideToGenerate(state: GraphState) {
  console.log(
    chalk.blue("--- DECIDE WHETEHR TO DO FINAL GENERATION OR SEARCH WEB ---")
  );
  const filteredDocs = state.documents;

  if (!filteredDocs.length) {
    // All documents have been filtered out and not relevane documents found
    console.log(chalk.magenta("---DECISION: SEARCH WEB ---"));
    return "searchWeb";
  }
  // We have relevant documents, so generate answer
  console.log(chalk.magenta("---DECISION: GENERATE FINAL RESULT ---"));
  return "useLLm";
}

/**
 * Decide if the question is well answered by DOCs or need to search Web
 *
 * @param {GraphState} state The current state of the graph.
 * @returns {String} Returns "searchWeb" or "useLLm"
 */
export function decideTheGenearionStyle(state: GraphState) {
  console.log(chalk.blue("--- DECIDE WHETEHR TO USE DOCS OR SEARCH WEB ---"));
  const generationStyle = state["generationStyle"];
  if (generationStyle == "websearch") {
    console.log(
      chalk.magenta(
        "---DECISION: QUESTION CANNOT BE ANSWERED USING DOCS, SO WEB SEARCH ---"
      )
    );
    return "searchWeb";
  } else {
    // # We have relevant documents, so generate answer
    console.log(
      chalk.magenta(
        "---DECISION: QUESTION CAN BE ANSWERED USING DOCS, SO USELLM ---"
      )
    );
    return "useLLm";
  }
}
