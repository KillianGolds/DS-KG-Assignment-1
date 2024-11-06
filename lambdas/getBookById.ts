import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from "./utils/dbClient"; // Import the createDdbDocClient function

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    
    const parameters = event?.pathParameters;
    const bookId = parameters?.bookId;

    if (!bookId) { // Check if the book ID is provided
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing book ID" }),
      };
    }

    const commandOutput = await ddbDocClient.send( // Fetch the book from the database
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { bookId },
      })
    );

    console.log("GetCommand response: ", commandOutput); 

    if (!commandOutput.Item) { // Check if the book exists
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Invalid book ID" }),
      };
    }

    return { 
      statusCode: 200,
      headers: { "content-type": "application/json" }, 
      body: JSON.stringify({ data: commandOutput.Item }), 
    };

  } catch (error: any) { 
    console.error("Error fetching book by ID:", error); // Log the error
    return { // Return an error message
      statusCode: 500,
      headers: { "content-type": "application/json" }, 
      body: JSON.stringify({ error: error.message }),
    };
  }
};
