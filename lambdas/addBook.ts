import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { Book } from "../shared/types"; // Ensure the Book interface is correctly imported
import { createDdbDocClient } from "./utils/dbClient"; // Import the createDdbDocClient function
import { v4 as uuidv4 } from "uuid";  // Generate unique book IDs

const ddbDocClient = createDdbDocClient(); 

export const handler: APIGatewayProxyHandlerV2 = async (event) => { 
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !body.title || !body.author) { // Check if the title and author are provided
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Title and author are required" }),
      };
    }

    const newBook: Book = { // Create a new book object
      bookId: uuidv4(), // Generate a unique ID for the book
      title: body.title,
      author: body.author,
      genre: body.genre || "Unknown",
      publishedDate: body.publishedDate || "Unknown",
      summary: body.summary || "No summary available",
    };

    await ddbDocClient.send(new PutCommand({ // Add the book to the database
      TableName: process.env.TABLE_NAME,
      Item: newBook,
    }));

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Book added successfully", book: newBook }), // Return a success message
    };
  } catch (error) {
    console.error("Error adding book:", error); // Log the error
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not add the book" }), // Return an error message
    };
  }
};
