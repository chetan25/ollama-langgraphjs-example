import "dotenv/config";
import chalk from "chalk";
import { END } from "@langchain/langgraph";
import getStateWorkflow from "./components/appStateGraph";
import {
  decideTheGenearionStyle,
  decideToGenerate,
  generateAnswerFromContext,
  gradeGeneratedDocuments,
  retrieveFromDocument,
  questionRouter,
  webSearch,
} from "./components/uitl";

async function init() {
  console.log(chalk.green.underline.bold("---- AGENT STARTING ----"));

  const workflow = getStateWorkflow();

  // Define the nodes
  workflow.addNode("retrieveFromDocument", retrieveFromDocument);
  workflow.addNode("gradeGeneratedDocuments", gradeGeneratedDocuments);
  workflow.addNode("generateAnswerFromContext", generateAnswerFromContext);
  workflow.addNode("webSearch", webSearch);
  workflow.addNode("router", questionRouter);

  // Build graph
  workflow.setEntryPoint("router");
  workflow.addEdge("webSearch", "generateAnswerFromContext");
  workflow.addEdge("retrieveFromDocument", "gradeGeneratedDocuments");
  workflow.addConditionalEdges("router", decideTheGenearionStyle, {
    searchWeb: "webSearch",
    useLLm: "retrieveFromDocument",
  });

  workflow.addConditionalEdges("gradeGeneratedDocuments", decideToGenerate, {
    searchWeb: "webSearch",
    useLLm: "generateAnswerFromContext",
  });
  workflow.addEdge("generateAnswerFromContext", END);

  // Compile
  const app = workflow.compile();
  const inputs = {
    question: "What are choices of ANN algorithms for fast MIPS",
    // "When was the last soccer world cup held and where? Give precise answer no explanation.",
  };
  const config = { recursionLimit: 50 };
  let finalGeneration;
  for await (const output of await app.stream(inputs, config)) {
    for (const [key, value] of Object.entries(output)) {
      // console.log(`Node: '${key}'`);
      // Optional: log full state at each node
      // console.log(JSON.stringify(value, null, 2));
      finalGeneration = value;
    }
  }

  // Log the final generation.
  console.log(chalk.green.bold("------ Question -------"));
  console.log(chalk.green.bold(finalGeneration.question));
  console.log(chalk.green.bold("------Answer-------"));
  console.log(chalk.green.bold(finalGeneration.generation));
}

init();
