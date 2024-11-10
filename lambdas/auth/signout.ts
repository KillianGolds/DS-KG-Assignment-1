import { APIGatewayProxyHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, GlobalSignOutCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log("Attempting to sign out...");

    // Extract the Authorization header from the request
    const authHeader = event.headers["Authorization"] || event.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("No valid Authorization header found.");
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Access token is required" }),
      };
    }

    // Get the access token from the Authorization header
    const accessToken = authHeader.split(" ")[1];

    // Use the access token to sign out the user
    const signOutCommand = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });
    await cognitoClient.send(signOutCommand);

    return { // Return success message
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers": "*", // Allow CORS headers
        "Access-Control-Allow-Origin": "*", // Allow CORS origin
        "Access-Control-Allow-Credentials": "true", // Allow CORS credentials
      },
      body: JSON.stringify({ //
        message: "User successfully signed out",
      }),
    };
  } catch (error: any) { // Catch and log any errors
    console.error("Error during sign out:", error);

    if (error.name === "NotAuthorizedException") { // Handle invalid or expired access token
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid or expired access token" }), // Return an error message
      };
    }

    return { 
      statusCode: 500,
      body: JSON.stringify({ message: "Error signing out", error: error.message }), 
    };
  }
};
