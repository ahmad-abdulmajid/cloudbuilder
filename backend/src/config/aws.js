const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { ECRClient } = require("@aws-sdk/client-ecr");
const { ECSClient } = require("@aws-sdk/client-ecs");
const { EC2Client } = require("@aws-sdk/client-ec2");

const region = process.env.AWS_REGION;

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const awsConfig = { region, credentials };

const ecrClient = new ECRClient(awsConfig);
const ecsClient = new ECSClient(awsConfig);
const ec2Client = new EC2Client(awsConfig);

const awsSettings = {
  region,
  accountId: process.env.AWS_ACCOUNT_ID,
  ecrRepositoryName: process.env.ECR_REPOSITORY_NAME,
  ecrServicesRepositoryName: process.env.ECR_SERVICES_REPOSITORY_NAME,
  ecsClusterName: process.env.ECS_CLUSTER_NAME,
  executionRoleArn: process.env.ECS_EXECUTION_ROLE_ARN,
  logGroupName: process.env.ECS_LOG_GROUP_NAME,
};

module.exports = {
  ecrClient,
  ecsClient,
  ec2Client,
  awsSettings,
};