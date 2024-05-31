import "cheerio";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import chalk from "chalk";

let retriever = null;

const getRetriever = async () => {
  if (retriever) {
    return retriever;
  }
  const urls = ["https://lilianweng.github.io/posts/2023-06-23-agent/"];

  console.log(chalk.blue("--- Docs loading started ---"));
  const docs = await Promise.all(
    urls.map((url) => new CheerioWebBaseLoader(url).load())
  );
  console.log(chalk.blue("--- Docs loading done ---"));
  const docsList = docs.flat();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 250,
    chunkOverlap: 0,
  });
  const docSplits = await textSplitter.splitDocuments(docsList);

  // Add to vectorDB
  const vectorStore = await MemoryVectorStore.fromDocuments(
    docSplits,
    new OpenAIEmbeddings()
    // new OllamaEmbeddings({ model: "nomic-embed-text" })
  );
  retriever = vectorStore.asRetriever();

  return retriever;
};

export default getRetriever;
