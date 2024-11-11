import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from '@db-layer/utils/dbClient';

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const bookId = event.pathParameters?.bookId;

    if (!bookId) { 
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Book ID is required" }),
      };
    }

    // Convert bookId to a number, if it's stored as a number in DynamoDB
    const bookIdNumber = Number(bookId);

    
    // Step 1: Query to get the author using the BookIdIndex
    const queryOutput = await ddbDocClient.send( 
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        IndexName: process.env.INDEX_NAME, // Using the BookIdIndex
        KeyConditionExpression: "bookId = :bookId",
        ExpressionAttributeValues: {
          ":bookId": bookIdNumber,
        },
      })
    );

    // If the book does not exist
    if (!queryOutput.Items || queryOutput.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Book not found" }),
      };
    }

    const author = queryOutput.Items[0].author;

    // Step 2: Delete the book using author and bookId as the key
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          author,
          bookId: bookIdNumber,
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
