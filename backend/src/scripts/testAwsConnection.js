const { DescribeRepositoriesCommand } = require("@aws-sdk/client-ecr");
const { DescribeClustersCommand } = require("@aws-sdk/client-ecs");
const { ecrClient, ecsClient, awsSettings } = require("../config/aws");

const testConnection = async () => {
  console.log(`Region: ${awsSettings.region}`);
  console.log(`Account: ${awsSettings.accountId}`);
  console.log("");

  try {
    const ecrResult = await ecrClient.send(
      new DescribeRepositoriesCommand({
        repositoryNames: [awsSettings.ecrRepositoryName],
      })
    );

    const repo = ecrResult.repositories[0];
    console.log("ECR connection OK");
    console.log(`  Repository: ${repo.repositoryName}`);
    console.log(`  URI: ${repo.repositoryUri}`);
  } catch (error) {
    console.error("ECR connection FAILED");
    console.error(`  ${error.name}: ${error.message}`);
  }

  console.log("");

  try {
    const ecsResult = await ecsClient.send(
      new DescribeClustersCommand({
        clusters: [awsSettings.ecsClusterName],
      })
    );

    const cluster = ecsResult.clusters[0];

    if (!cluster) {
      console.error("ECS connection OK but cluster not found");
      return;
    }

    console.log("ECS connection OK");
    console.log(`  Cluster: ${cluster.clusterName}`);
    console.log(`  Status: ${cluster.status}`);
    console.log(`  Running tasks: ${cluster.runningTasksCount}`);
  } catch (error) {
    console.error("ECS connection FAILED");
    console.error(`  ${error.name}: ${error.message}`);
  }
};

testConnection();