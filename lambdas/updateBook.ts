import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from "./utils/dbClient";

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const bookIdString = event.pathParameters?.bookId; 
    const body = event.body ? JSON.parse(event.body) : undefined;

    // Check if the request body and book ID are provided
    if (!bookIdString || !body || !body.author) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Book ID, author, and update data are required" }), 
      };
    }

    // Convert bookId to a number
    const bookId = Number(bookIdString);
    const author = body.author;

    // Validate the bookId
    if (isNaN(bookId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid Book ID format" }),
      };
    }

    const updateExpressions: string[] = []; // Array to store the update expressions
    const expressionAttributeNames: Record<string, string> = {}; // Object to store the attribute names
    const expressionAttributeValues: Record<string, any> = {}; // Object to store the attribute values

    // Construct the update expression excluding primary keys (author and bookId)
    for (const [key, value] of Object.entries(body)) {
      if (key !== "author" && key !== "bookId") {  // Exclude author and bookId 
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    // Ensure there are fields to update
    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No valid fields to update" }),
      };
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`; 

    // Execute the UpdateCommand
    await ddbDocClient.send(new UpdateCommand({ 
      TableName: process.env.TABLE_NAME,
      Key: { author, bookId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Book updated successfully" }), // Return a success message
    };
  } catch (error) {
    console.error("Error updating book:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not update the book" }), // Return an error message
    };
  }
};
