// DynamoDB Document Client shared by all Lambda functions in the project as a lambda layer
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Create a DynamoDB Document Client
export function createDdbDocClient() { 
  const ddbClient = new DynamoDBClient({ region: process.env.REGION }); // Create a DynamoDB client
  const marshallOptions = { // Set the marshall options
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  }; 
  const unmarshallOptions = { // Set the unmarshall options
    wrapNumbers: false,
  }; 
  const translateConfig = { marshallOptions, unmarshallOptions }; 
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
} 