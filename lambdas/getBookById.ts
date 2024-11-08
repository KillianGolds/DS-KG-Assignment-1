import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from "./utils/dbClient";

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const parameters = event?.pathParameters;
    const bookId = parameters?.bookId;

    if (!bookId) { // Check if the book ID is provided
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing book ID" }),
      };
    }

    const bookIdNumber = Number(bookId);

    const commandOutput = await ddbDocClient.send( // Query the database for the book
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        IndexName: process.env.INDEX_NAME, // Use the BookIdIndex
        KeyConditionExpression: "bookId = :bookId",
        ExpressionAttributeValues: {
          ":bookId": bookIdNumber,
        },
      })
    );

    console.log("QueryCommand response: ", commandOutput); // Log the response

    // If the book is not found
    if (!commandOutput.Items || commandOutput.Items.length === 0) { 
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Book not found" }),
      };
    }
    return { 
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: commandOutput.Items[0] }), // Return first matching item
    };
    
  } catch (error: any) {
    console.error("Error fetching book by ID:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
