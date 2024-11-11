import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createDdbDocClient } from './utils/dbClient';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as AWS from 'aws-sdk';

const ddbDocClient = createDdbDocClient();
const translate = new AWS.Translate();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const pathParameters = event?.pathParameters; 
    const queryParameters = event?.queryStringParameters; 

    const bookId = pathParameters?.bookId;  // Extract bookId from path parameters
    const author = queryParameters?.author;
    const language = queryParameters?.language;

    // Validate required parameters
    if (!bookId || !author || !language) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ message: 'Book ID, author, and target language are all required.' }) 
      };
    }

    const bookIdNumber = Number(bookId); // Convert bookId to a number
    if (isNaN(bookIdNumber)) { // Check if bookId is a valid number
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid Book ID format, it must be a number.' }) };
    }

    // Retrieve the book item from DynamoDB
    const getCommand = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        author,
        bookId: bookIdNumber,
      },
    });

    const getResult = await ddbDocClient.send(getCommand); // Execute the GetCommand
    if (!getResult.Item) { // Check if the book item exists
      return { statusCode: 404, body: JSON.stringify({ message: 'Book not found' }) };
    }

    const bookItem = getResult.Item; // Extract the book item

    if (!bookItem.summary) { // Check if the summary field exists
      return { statusCode: 400, body: JSON.stringify({ message: 'Summary not found in the book item.' }) };
    }

    // Check if the translation already exists
    const translatedSummaryKey = `translatedSummary_${language}`;
    if (bookItem[translatedSummaryKey]) {
      console.log(`[INFO] Translation for language ${language} already exists.`);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ translatedSummary: bookItem[translatedSummaryKey] }) 
      };
    }

    // Perform translation using AWS Translate
    const translateParams: AWS.Translate.Types.TranslateTextRequest = {
      Text: bookItem.summary,
      SourceLanguageCode: 'en',
      TargetLanguageCode: language,
    };

    const translatedMessage = await translate.translateText(translateParams).promise(); // Execute the translation
    const translatedText = translatedMessage.TranslatedText; // Extract the translated text

    // Update DynamoDB item with the translated summary
    const updateCommand = new UpdateCommand({ 
      TableName: process.env.TABLE_NAME,
      Key: {
        author, 
        bookId: bookIdNumber,
      },
      UpdateExpression: 'SET #translatedSummaryKey = :translatedText', // Update the translated summary
      ExpressionAttributeNames: {
        '#translatedSummaryKey': translatedSummaryKey, // Use the translatedSummaryKey as the attribute name
      },
      ExpressionAttributeValues: {
        ':translatedText': translatedText, // Set the translated text as the attribute value
      },
    });

    await ddbDocClient.send(updateCommand); // Execute the UpdateCommand

    return { statusCode: 200, body: JSON.stringify({ translatedSummary: translatedText }) }; // Return the translated summary
  } catch (error: any) { 
    console.error('Error in translateBook handler:', error); // Log the error
    return { 
      statusCode: 500,  // Return a 500 error code
      body: JSON.stringify({ message: 'Unable to translate the book', error: error.message }) // Return an error message
    };
  }
};
