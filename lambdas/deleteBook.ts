import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from "./utils/dbClient"; // Import the createDdbDocClient function

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const bookId = event.pathParameters?.bookId;

    if (!bookId) { // Check if the book ID is provided
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Book ID is required" }),
      };
    }

    await ddbDocClient.send(new DeleteCommand({ // Delete the book from the database
      TableName: process.env.TABLE_NAME,
      Key: { bookId }, 
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Book deleted successfully" }), // Return a success message
    };
  } catch (error) {
    console.error("Error deleting book:", error); // Log the error 
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not delete the book" }), // Return an error message
    };
  }
};
