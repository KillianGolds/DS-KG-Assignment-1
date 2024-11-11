import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createDdbDocClient } from '@db-layer/utils/dbClient';

const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    const command = new ScanCommand({ // Fetch all books from the database
      TableName: process.env.TABLE_NAME,
    });
    
    const { Items } = await ddbDocClient.send(command); // Execute the command and get the items

    return { // Return the books
      statusCode: 200,
      body: JSON.stringify({ books: Items || [] }),
    };
  } catch (error) {
    console.error("Error fetching books:", error); // Log the error
    return { // Return an error message
      statusCode: 500,
      body: JSON.stringify({ message: "Could not retrieve books" }), 
    };
  }
};