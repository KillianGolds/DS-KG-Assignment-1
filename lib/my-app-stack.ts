import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as custom from "aws-cdk-lib/custom-resources";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as path from "path";
import { generateBatch } from "../shared/util";
import { books } from "../seed/books";

export class MyAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Setup Cognito User Pool (for user authentication)
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: { userPassword: true,},
    });

    // Create Cognito Authorizer
    // I took time to learn how to use the CognitoUserPoolsAuthorizer class from the AWS CDK documentation
    const cognitoAuthorizer = new apig.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [userPool],
    });

    // Books Table with a global secondary index on bookId
    const booksTable = new dynamodb.Table(this, "BooksTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "author", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add a global secondary index on bookId
    booksTable.addGlobalSecondaryIndex({
      indexName: "BookIdIndex",
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
    });

    // Lambda Functions for Auth Operations
    // Signup Function
    const signupFn = new lambdanode.NodejsFunction(this, "SignupFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambdas/auth/signup.ts"),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });

    // Signin Function
    const signinFn = new lambdanode.NodejsFunction(this, "SigninFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambdas/auth/signin.ts"),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });


    // Signout Function
    const signoutFn = new lambdanode.NodejsFunction(this, "SignoutFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambdas/auth/signout.ts"),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });


    // Confirm Signup Function
    const confirmSignupFn = new lambdanode.NodejsFunction(this, "ConfirmSignupFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambdas/auth/confirm-signup.ts"),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });

    // API Gateway setup for Auth API
    const authApi = new apig.RestApi(this, "AuthApi", {
      description: "Authentication API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // Auth Endpoints
    const authEndpoint = authApi.root.addResource("auth");
    authEndpoint.addResource("signup").addMethod("POST", new apig.LambdaIntegration(signupFn));
    authEndpoint.addResource("signin").addMethod("POST", new apig.LambdaIntegration(signinFn));
    authEndpoint.addResource("signout").addMethod("GET", new apig.LambdaIntegration(signoutFn));
    authEndpoint.addResource("confirm_signup").addMethod("POST", new apig.LambdaIntegration(confirmSignupFn));

    // Lambda Functions for Book Operations
    const commonLambdaProps = {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: "eu-west-1",
      },
    };

    // Get Book by Id Function
    const getBookByIdFn = new lambdanode.NodejsFunction(this, "GetBookByIdFn", {
      ...commonLambdaProps,
      entry: `${__dirname}/../lambdas/getBookById.ts`,
      environment: {
        ...commonLambdaProps.environment,
        INDEX_NAME: "BookIdIndex",
      },
    });

    // Get All Books Function
    const getAllBooksFn = new lambdanode.NodejsFunction(this, "GetAllBooksFn", {
      ...commonLambdaProps,
      entry: `${__dirname}/../lambdas/getAllBooks.ts`,
    });

    // Get Books by Author Function
    const getBooksByAuthorFn = new lambdanode.NodejsFunction(this, "GetBooksByAuthorFn", {
      ...commonLambdaProps,
      entry: `${__dirname}/../lambdas/getBooksByAuthor.ts`,
    });

    // Add Book Function
    const newBookFn = new lambdanode.NodejsFunction(this, "AddBookFn", {
      ...commonLambdaProps,
      entry: `${__dirname}/../lambdas/addBook.ts`,
    });

    // Delete Book Function
    const deleteBookFn = new lambdanode.NodejsFunction(this, "DeleteBookFn", {
      ...commonLambdaProps,
      entry: `${__dirname}/../lambdas/deleteBook.ts`,
      environment: {
        ...commonLambdaProps.environment,
        INDEX_NAME: "BookIdIndex",
      },
    });

    // Update Book Function
    const updateBookFn = new lambdanode.NodejsFunction(this, "UpdateBookFn", {
      ...commonLambdaProps,
      entry: `${__dirname}/../lambdas/updateBook.ts`,
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

    // Permissions for Lambda Functions
    booksTable.grantReadData(getBookByIdFn);
    booksTable.grantReadData(getAllBooksFn);
    booksTable.grantReadData(getBooksByAuthorFn);
    booksTable.grantReadWriteData(newBookFn);
    booksTable.grantReadWriteData(deleteBookFn);
    booksTable.grantReadWriteData(updateBookFn);

    // API Gateway setup for Books API
    const booksApi = new apig.RestApi(this, "BooksApi", {
      description: "Books API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // API Endpoints for Books
    const booksEndpoint = booksApi.root.addResource("books");
    const bookEndpoint = booksEndpoint.addResource("{bookId}");

    // Public endpoints (no authentication required)
    booksEndpoint.addMethod("GET", new apig.LambdaIntegration(getAllBooksFn)); // GET all books
    booksEndpoint.addResource("by-author").addMethod("GET", new apig.LambdaIntegration(getBooksByAuthorFn)); // GET books by author
    bookEndpoint.addMethod("GET", new apig.LambdaIntegration(getBookByIdFn)); //  GET book by bookId
    

    // Protected endpoints (require authentication)
    booksEndpoint.addMethod("POST", new apig.LambdaIntegration(newBookFn), { // POST new book
      authorizer: cognitoAuthorizer,
      authorizationType: apig.AuthorizationType.COGNITO,
    });

    bookEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateBookFn), { // PUT update book
      authorizer: cognitoAuthorizer,
      authorizationType: apig.AuthorizationType.COGNITO,
    });

    bookEndpoint.addMethod("DELETE", new apig.LambdaIntegration(deleteBookFn), { // DELETE book
      authorizer: cognitoAuthorizer,
      authorizationType: apig.AuthorizationType.COGNITO,
    });

    
  }
}
