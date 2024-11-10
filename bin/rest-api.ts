#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MyAppStack } from "../lib/my-app-stack";

const app = new cdk.App();  // Create a new CDK app
new MyAppStack(app, "RestApiStack", { env: { region: "eu-west-1" } }); // Create a new stack
