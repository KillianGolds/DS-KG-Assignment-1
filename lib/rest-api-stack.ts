import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { books } from "../seed/books"; // Books seed data
import * as apig from "aws-cdk-lib/aws-apigateway";

export class RestApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Books Table with a global secondary index  on bookId
    const booksTable = new dynamodb.Table(this, "BooksTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "author", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Books",
    });

    // global secondary index for querying by bookId only
    booksTable.addGlobalSecondaryIndex({
      indexName: "BookIdIndex",
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
    });

    // Lambda Functions
    // get a book by bookId using the secondary index
    const getBookByIdFn = new lambdanode.NodejsFunction(this, "GetBookByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getBookById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        INDEX_NAME: "BookIdIndex",  // Secondary index name for querying by bookId
        REGION: "eu-west-1",
      },
    });

    // get all books
    const getAllBooksFn = new lambdanode.NodejsFunction(this, "GetAllBooksFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllBooks.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // books by author
    const getBooksByAuthorFn = new lambdanode.NodejsFunction(this, "GetBooksByAuthorFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getBooksByAuthor.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // add a new book
    const newBookFn = new lambdanode.NodejsFunction(this, "AddBookFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addBook.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // delete a book by bookId using the secondary index
    const deleteBookFn = new lambdanode.NodejsFunction(this, "DeleteBookFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/deleteBook.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        INDEX_NAME: "BookIdIndex",
        REGION: "eu-west-1",
      },
    });

    // Data Seeding
    new custom.AwsCustomResource(this, "booksddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [booksTable.tableName]: generateBatch(books),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("booksddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [booksTable.tableArn],
      }),
    });

    // Permissions for each Lambda function
    booksTable.grantReadData(getBookByIdFn);
    booksTable.grantReadData(getAllBooksFn);
    booksTable.grantReadData(getBooksByAuthorFn);
    booksTable.grantReadWriteData(newBookFn);
    booksTable.grantReadWriteData(deleteBookFn);

    // API Gateway setup
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Books API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // API endpoint for all books and books by author
    const booksEndpoint = api.root.addResource("books");

    // GET all books
    booksEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllBooksFn, { proxy: true })
    );

    // POST new book
    booksEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newBookFn, { proxy: true })
    );

    // GET books by author using a query string parameter
    const booksByAuthorEndpoint = booksEndpoint.addResource("by-author");
    booksByAuthorEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getBooksByAuthorFn, { proxy: true }),
      {
        requestParameters: {
          "method.request.querystring.author": true,
        },
      }
    );

    // GET and DELETE single book by bookId
    const bookEndpoint = booksEndpoint.addResource("{bookId}");
    bookEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getBookByIdFn, { proxy: true })
    );
    bookEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteBookFn, { proxy: true })
    );
  }
}
