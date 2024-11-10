import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from "./utils/dbClient";

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const author = event?.queryStringParameters?.author;

    if (!author) { // Check if the author is provided
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing author parameter" }),
      };
    }
    const commandOutput = await ddbDocClient.send( // Query the database for books by author
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "author = :author",
        ExpressionAttributeValues: { ":author": author },
      })
    );
    return { // Return the list of books by the author
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: commandOutput.Items || [] }),
    };

  } catch (error: any) {
    console.error("Error fetching books by author:", error);
    return { // Return an error message
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
