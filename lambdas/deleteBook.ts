import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from '@db-layer/utils/dbClient';

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Extract the user ID from the authorizer claims
    const ownerId = (event.requestContext as any).authorizer?.claims?.sub;

    if (!ownerId) { // Check if the user ID is provided
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Unauthorized request" }),
      };
    }

    const bookIdString = event.pathParameters?.bookId; // Extract the book ID from the path parameters
    const author = event.queryStringParameters?.author; // Extract the author from the query parameters

    if (!bookIdString || !author) { // Check if the book ID and author are provided
      return { 
        statusCode: 400,
        body: JSON.stringify({ message: "Book ID and author are required" }),
      };
    }

    // Convert bookId to a number
    const bookId = Number(bookIdString);

    // Validate the bookId
    if (isNaN(bookId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid Book ID format" }),
      };
    }

    // Retrieve the book item to validate ownership
    const getCommand = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { author, bookId },
    });

    const getResult = await ddbDocClient.send(getCommand); // Get the book item from the database
    if (!getResult.Item) { // Check if the book exists
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Book not found" }),
      };
    }

    // Validate that the user trying to delete the book is the owner
    if (getResult.Item.ownerId !== ownerId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "You do not have permission to delete this book" }),
      };
    }

    // Delete the book using author and bookId as the key
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          author,
          bookId,
        },
      })
    );

    return { // Return a success message if the book is deleted
      statusCode: 200,
      body: JSON.stringify({ message: "Book deleted successfully" }),
    };
  } catch (error) { // Return an error message if the book could not be deleted
    console.error("Error deleting book:", error); 
    return { 
      statusCode: 500,
      body: JSON.stringify({ message: "Could not delete the book" }), 
    };
  }
};
