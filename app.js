const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Pinecone } = require("@pinecone-database/pinecone");
require("dotenv").config();
const cors = require("cors");

// Memory to store conversation context (could be in-memory or move to a database)
let conversationMemory = []; // Array to store conversation history

// Express app setup
const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON requests

// Helper function to classify the user message
const classifyMessage = async (message) => {
  const prompt = `
    You are an intelligent assistant for ProfSync, specializing in professors. Your task is to classify the message:
    Message: "${message}"
    Determine whether the message is related to professors (e.g., ratings, reviews, professor inquiries) or if it is a casual conversation.

    Please return one of the following classifications (just text):
    1. Professor-Specific
    2. Casual Conversation
  `;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.REACT_APP_GOOGLE_API_KEY}`;

  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.candidates[0].content.parts[0].text.trim(); // Return either "Professor-Specific" or "Casual Conversation"
};

// Function to keep conversation history token-efficient
const minimizeConversationMemory = (memory) => {
  return memory
    .map((entry) => ({
      userMessage: entry.message,
      classification: entry.classification,
    }))
    .slice(-5); // Store only the last 5 messages to conserve tokens
};

// Function to handle the conversation based on message classification
const handleSendMessage = async (message) => {
  try {
    const classification = await classifyMessage(message);

    // Store the message and classification in conversation memory
    conversationMemory.push({ message, classification });

    // Minimize token usage by only storing the last 5 interactions
    const minimizedMemory = minimizeConversationMemory(conversationMemory);

    if (classification === "Professor-Specific") {
      const embedding = await generateEmbedding(message);
      const pineconeResults = await searchPinecone(embedding.values);
      const summarizedResult = await summarizeWithGemini(
        pineconeResults,
        message
      );

      return processStringToHTML(summarizedResult); // Process the result string into HTML format
    } else {
      const genericResponse = await handleGenericConversation(message);

      return processStringToHTML(genericResponse); // Process the result string into HTML format
    }
  } catch (error) {
    console.error("Error handling the message:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};

// Function to generate embeddings using Google Gemini
const generateEmbedding = async (message) => {
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent(message);
  return result.embedding;
};

// Function to search Pinecone using the generated embedding
const searchPinecone = async (embedding) => {
  const pc = new Pinecone({
    apiKey: process.env.REACT_APP_PINECONE_API_KEY,
  });
  const index = pc
    .index(`${process.env.REACT_APP_PINECONE_INDEX_NAME}`)
    .namespace("ns1");

  const results = await index.query({
    topK: 5,
    vector: embedding,
    includeMetadata: true,
  });

  let resultString = "Returned Results from Pinecone: ";
  results.matches.forEach((match) => {
    resultString += `
      Professor: ${match.id}
      Review: ${match.metadata.review}
      Subject: ${match.metadata.subject}
      Stars: ${match.metadata.stars}
      \n\n
    `;
  });

  return resultString;
};

// Function to summarize using Google Gemini
const summarizeWithGemini = async (pineconeResults, message) => {
  const prompt = `You're a friendly assistant of ProfSync that is similar to rate my professor and these are the matched results from Pinecone: ${pineconeResults} Can you
  please formulate the response for user based on the following message ${message}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.REACT_APP_GOOGLE_API_KEY}`;

  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.candidates[0].content.parts[0].text.trim();
};

// Function to handle casual conversations using Google Gemini
const handleGenericConversation = async (message) => {
  const prompt = `You are a friendly assistant of ProfSync that is similar to Rate My Professor. Here is the user's message: "${message}". Respond accordingly.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.REACT_APP_GOOGLE_API_KEY}`;

  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.candidates[0].content.parts[0].text.trim();
};

// Helper function to process the string into proper HTML format
const processStringToHTML = (inputString) => {
  // Convert * **...** to <li><strong>...</strong>
  let htmlString = inputString
    .replace(/\*\*\s*/g, "<strong> ") // Replace ** with <strong>
    .replace(/\*\*$/, "</strong> ") // Replace closing ** with </strong>
    .replace(/\*\s/g, "<li> ") // Replace * with <li>
    .replace(/(\*\*)$/g, "</li> "); // Ensure ending asterisks close the list item properly

  // Close strong tags correctly, ensure bullet points are properly formatted
  htmlString = htmlString.replace(
    /<strong>(.*?)<strong>/g,
    "<strong> $1 </strong>"
  );

  // Wrap it in <ul> if there are list items
  if (htmlString.includes("<li> ")) {
    htmlString = `<ul> ${htmlString} </ul>`;
  }

  // Add any final paragraphs or non-list items separately
  return htmlString;
};

// Route for sending messages
app.post("/api/send-message", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).send({ error: "Message is required" });
  }

  try {
    const response = await handleSendMessage(message);
    res.send({ response });
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
