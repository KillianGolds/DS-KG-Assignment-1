import { APIGatewayProxyHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, SignUpCommand, SignUpCommandInput } from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../../shared/types.schema.json";

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

// Initialize Ajv and compile schema validation
const ajv = new Ajv();
addFormats(ajv); // Enable email format validation
const isValidBodyParams = ajv.compile(schema.definitions["SignUpBody"] || {}); 
 
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate the request body
    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid request body format.",
          schema: schema.definitions["SignUpBody"],
        }),
      };
    }

    // Extract and validate parameters
    const { password, email } = body;
    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password are required" }),
      };
    }

    // Configure the sign-up parameters (use email as username)
    const signUpParams: SignUpCommandInput = {
      ClientId: process.env.CLIENT_ID!,
      Username: String(email), // Use email as the username
      Password: String(password),
      UserAttributes: [
        {
          Name: "email",
          Value: String(email),
        },
      ],
    };

    // Execute the sign-up command
    const signUpCommand = new SignUpCommand(signUpParams);
    await cognitoClient.send(signUpCommand);

    return { // Return success message
      statusCode: 200,
      body: JSON.stringify({ message: "User signed up successfully. Please check your email for a verification code." }),
    };
  } catch (error) { // Catch and log any errors
    console.error("Error during signup:", error);
    return { // Return error message
      statusCode: 500,
      body: JSON.stringify({ message: "Error signing up user", error: error.message }),
    };
  }
};
