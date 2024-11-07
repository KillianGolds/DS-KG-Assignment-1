import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class RestApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for Books
    const booksTable = new dynamodb.Table(this, 'BooksTable', {
      partitionKey: { name: 'bookId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda functions
    const addBookLambda = new lambda.Function(this, 'AddBookLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'addBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: {
        TABLE_NAME: booksTable.tableName,
      },
    });

    const deleteBookLambda = new lambda.Function(this, 'DeleteBookLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'deleteBook.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: {
        TABLE_NAME: booksTable.tableName,
      },
    });

    const getAllBooksLambda = new lambda.Function(this, 'GetAllBooksLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'getAllBooks.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: {
        TABLE_NAME: booksTable.tableName,
      },
    });

    const getBookByIdLambda = new lambda.Function(this, 'GetBookByIdLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'getBookById.handler',
      code: lambda.Code.fromAsset('lambdas'),
      environment: {
        TABLE_NAME: booksTable.tableName,
      },
    });

    // Grant permissions to Lambda functions
    booksTable.grantReadWriteData(addBookLambda);
    booksTable.grantWriteData(deleteBookLambda);
    booksTable.grantReadData(getAllBooksLambda);
    booksTable.grantReadData(getBookByIdLambda);
    
    // API Gateway setup
    const api = new apigateway.RestApi(this, 'BooksApi', {
      restApiName: 'Books Service',
      description: 'This service serves books.',
    });

    // API endpoints
    const books = api.root.addResource('books');

    // POST /books - Add a new book
    books.addMethod('POST', new apigateway.LambdaIntegration(addBookLambda));

    // GET /books - Get all books
    books.addMethod('GET', new apigateway.LambdaIntegration(getAllBooksLambda));

    // GET /books/{bookId} - Get a specific book by ID
    const singleBook = books.addResource('{bookId}');
    singleBook.addMethod('GET', new apigateway.LambdaIntegration(getBookByIdLambda));

    // DELETE /books/{bookId} - Delete a book by ID
    singleBook.addMethod('DELETE', new apigateway.LambdaIntegration(deleteBookLambda));
  }
}
