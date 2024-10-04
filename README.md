# ProfSync Backend

ProfSync is a professor rating and review system similar to Rate My Professor. This repository contains the backend code for the ProfSync application, which includes a chatbot capable of handling both professor-specific queries and casual conversations.

## Features

- Express.js server setup with CORS support
- Integration with Google's Generative AI (Gemini) for message classification and response generation
- Pinecone vector database integration for efficient similarity search
- Conversation memory management for context preservation
- Dynamic response formatting for both professor-specific and casual conversations

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed
- npm (Node Package Manager) installed
- Pinecone account and API key
- Google Generative AI API key

## Installation

1. Clone the repository:
   ```
   git clone [repository-url]
   ```

2. Navigate to the project directory:
   ```
   cd profsync-backend
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory and add the following environment variables:
   ```
   REACT_APP_GOOGLE_API_KEY=[Your Google API Key]
   REACT_APP_PINECONE_API_KEY=[Your Pinecone API Key]
   REACT_APP_PINECONE_INDEX_NAME=[Your Pinecone Index Name]
   PORT=5000
   ```

## Usage

To start the server, run:

```
npm start
```

The server will start running on `http://localhost:5000`.

## API Endpoints

### POST /api/send-message

Send a message to the chatbot.

Request body:
```json
{
  "message": "Your message here"
}
```

Response:
```json
{
  "response": "HTML formatted response from the chatbot"
}
```

## Architecture

1. **Message Classification**: Incoming messages are classified as either "Professor-Specific" or "Casual Conversation" using Google's Generative AI.

2. **Embedding Generation**: For professor-specific queries, the message is converted into an embedding using Google's text-embedding-004 model.

3. **Pinecone Search**: The embedding is used to search for similar entries in the Pinecone vector database.

4. **Response Generation**: 
   - For professor-specific queries, the Pinecone results are summarized using Google's Generative AI.
   - For casual conversations, a generic response is generated.

5. **Response Formatting**: The final response is formatted into HTML for easy rendering on the frontend.

## Other code modules

- Frontend module can be accessed [here](https://github.com/nh0397/ProfSync).
- Code to generate and store data to pinecone can be accessed [here](https://github.com/nh0397/ProfSync-DataLoader)

## Contributing

Contributions to ProfSync are welcome. Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License, Version 2.0

## Contact

For any questions or inquiries about this project, please contact [Your Name] at [your email or preferred contact method].
