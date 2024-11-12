import { APIGatewayProxyHandlerV2, APIGatewayEventRequestContextV2 } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { Book } from "../shared/types"; 
import { createDdbDocClient } from '@db-layer/utils/dbClient';

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => { 
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !body.title || !body.author) { // Check if the title and author are provided
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Title and author are required" }),
      };
    }

    // Extract the user ID from the authorizer claims 
    interface CustomAuthorizerContext extends APIGatewayEventRequestContextV2 {
      authorizer?: {
        claims?: {
          sub?: string;
        };
      };
    }

    const ownerId = (event.requestContext as CustomAuthorizerContext).authorizer?.claims?.sub;

    if (!ownerId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Unauthorized request" }),
      };
    }

    // Generate a new book with an incrementing book ID (or other logic if needed)
    const bookId = Date.now(); // Using timestamp as a simple numeric ID

    const newBook: Book = { 
      bookId: bookId,
      title: body.title,
      author: body.author,
      genre: body.genre || "Unknown", 
      publishedYear: body.publishedYear || new Date().getFullYear(), // default to current year if not provided
      summary: body.summary || "Lorem ipsum is typically a corrupted version of De finibus bonorum et malorum, a 1st-century BC text by the Roman statesman and philosopher Cicero, with words altered, added, and removed to make it nonsensical and improper Latin.",
      ownerId: ownerId, // Using the extracted owner ID from the authorizer claims
    };

    await ddbDocClient.send(new PutCommand({ // Add the new book to the database
      TableName: process.env.TABLE_NAME,
      Item: newBook,
    }));

    return { // Return a success message with the new book
      statusCode: 201,
      body: JSON.stringify({ message: "Book added successfully", book: newBook }), 
    };
  } catch (error) {
    console.error("Error adding book:", error); 
    return { // Return an error message if the book could not be added
      statusCode: 500,
      body: JSON.stringify({ message: "Could not add the book" }), 
    };
  }
};
