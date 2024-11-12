import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from '@db-layer/utils/dbClient';

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Extract the user ID from the authorizer claims
    const ownerId = (event.requestContext as any).authorizer?.claims?.sub;

    if (!ownerId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Unauthorized request" }),
      };
    }

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

    // Validate that the user attempting to update the book is the owner
    if (getResult.Item.ownerId !== ownerId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "You do not have permission to update this book" }),
      };
    }

    // Prepare the UpdateCommand parameters
    const updateExpressions: string[] = []; // Array to store the update expressions
    const expressionAttributeNames: Record<string, string> = {}; // Object to store the attribute names
    const expressionAttributeValues: Record<string, any> = {}; // Object to store the attribute values

    for (const [key, value] of Object.entries(body)) { // Iterate over the fields in the request body
      if (key !== "author" && key !== "bookId") {  // Exclude author and bookId 
        updateExpressions.push(`#${key} = :${key}`); // Add the update expression. The typescript expressions took a very long time to figure out.
        expressionAttributeNames[`#${key}`] = key; // Add the attribute name
        expressionAttributeValues[`:${key}`] = value; // Add the attribute value. 
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
