import { PromptTemplate } from "@langchain/core/prompts";

export const rag_prompt = new PromptTemplate({
  template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|> You are an assistant for question-answering tasks. 
        Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. 
        Use three sentences maximum and keep the answer concise <|eot_id|><|start_header_id|>user<|end_header_id|>
        Question: {question} 
        Context: {context} 
        Answer: <|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
  inputVariables: ["question", "context"],
});

export const grader_prompt = new PromptTemplate({
  template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|> You are a grader assessing relevance 
        of a retrieved document to a user question. If the document contains keywords related to the user question, 
        grade it as relevant. It does not need to be a stringent test. The goal is to filter out erroneous retrievals. \n
        Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question. \n
        Provide the binary score as a JSON with a single key 'score' and no premable or explanation.
         <|eot_id|><|start_header_id|>user<|end_header_id|>
        Here is the retrieved document: \n\n {document} \n\n
        Here is the user question: {question} \n <|eot_id|><|start_header_id|>assistant<|end_header_id|>
        `,
  inputVariables: ["question", "document"],
});

export const router_prompt = new PromptTemplate({
  template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|> You are an expert at routing a 
          user question to a vectorstore or web search. Use the vectorstore for questions on LLM  agents, 
          prompt engineering, and adversarial attacks. You do not need to be stringent with the keywords 
          in the question related to these topics. Otherwise, use web-search. Give a binary choice 'web_search' 
          or 'vectorstore' based on the question. Return the a JSON with a single key 'datasource' and 
          no premable or explanation. Question to route: {question} <|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
  inputVariables: ["question"],
});
