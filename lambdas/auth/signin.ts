import { APIGatewayProxyHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse the request body for username and password
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      console.warn("Username or password missing in request");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Username and password are required" }),
      };
    }

    // Log the received username
    console.log("Attempting sign-in for username:", username);

    // Initiate authentication with Cognito
    const authCommand = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.CLIENT_ID!, 
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    });

    const response = await cognitoClient.send(authCommand); // Send the request to Cognito
    const idToken = response.AuthenticationResult?.IdToken; // Extract the ID token
    const accessToken = response.AuthenticationResult?.AccessToken; // Extract the access token
    const refreshToken = response.AuthenticationResult?.RefreshToken; // Extract the refresh token

    // Log the received tokens for debugging purposes
    if (!idToken || !accessToken) {
      console.warn("Authentication failed, no token received for username:", username);
      return { // Return an error message
        statusCode: 400, 
        body: JSON.stringify({ message: "Authentication failed" }),
      };
    }
    console.log("Authentication successful, token generated for username:", username);

    return { // Return success message with tokens
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({
        message: "User successfully signed in",
        idToken,
        accessToken,
        refreshToken,
      }),
    };
  } catch (error) { // Catch and log any errors
    console.error("Error during sign-in:", error);
    return { // Return an error message
      statusCode: 500,
      body: JSON.stringify({ message: "Error signing in", error: error.message }),
    };
  }
};
