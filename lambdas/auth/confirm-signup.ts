import { APIGatewayProxyHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, ConfirmSignUpCommand, ConfirmSignUpCommandInput } from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../../shared/types.schema.json";

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

// Initialize Ajv and compile schema validation
const ajv = new Ajv();
addFormats(ajv); // Enable email format validation
const isValidBodyParams = ajv.compile(schema.definitions["ConfirmSignUpBody"] || {});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate the request body format
    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid request body format.",
          schema: schema.definitions["ConfirmSignUpBody"],
        }),
      };
    }

    // Extract parameters and ensure they are strings
    const username: string = body.username as string;
    const code: string = body.code as string;

    if (!username || !code) { // Check if username and confirmation code are provided
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Username and confirmation code are required" }),
      };
    }

    // Prepare confirm sign-up request for Cognito
    const confirmCommandParams: ConfirmSignUpCommandInput = {
      ClientId: process.env.CLIENT_ID!,
      Username: username,
      ConfirmationCode: code,
    };

    const confirmCommand = new ConfirmSignUpCommand(confirmCommandParams); // Create the command
    await cognitoClient.send(confirmCommand); // Send the command to Cognito

    return { // Return success message
      statusCode: 200,
      body: JSON.stringify({ message: "User confirmed successfully" }),
    };
  } catch (error) { // Catch and log any errors
    console.error("Error during confirm signup:", error);
    return { // Return an error message
      statusCode: 500,
      body: JSON.stringify({ message: "Error confirming user sign-up", error: (error as Error).message }),
    };
  }
};
