const { GetAuthorizationTokenCommand } = require("@aws-sdk/client-ecr");
const { ecrClient, awsSettings } = require("../config/aws");
const { runCommand, runCommandWithInput } = require("../utils/runCommand");

function getEcrRegistryUrl() {
  return `${awsSettings.accountId}.dkr.ecr.${awsSettings.region}.amazonaws.com`;
}

function getEcrImageTag(service) {
  return `service-${service.id}`;
}

function getEcrImageUri(service) {
  const registry = getEcrRegistryUrl();
  const repository = awsSettings.ecrServicesRepositoryName;
  return `${registry}/${repository}:${getEcrImageTag(service)}`;
}

async function loginToEcr() {
  console.log("Requesting ECR authorization token");

  const result = await ecrClient.send(new GetAuthorizationTokenCommand({}));
  const authData = result.authorizationData[0];

  const decoded = Buffer.from(authData.authorizationToken, "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  const registry = getEcrRegistryUrl();

  console.log(`Logging in to ECR registry: ${registry}`);

  await runCommandWithInput(
    "docker",
    ["login", "--username", username, "--password-stdin", registry],
    password,
    { timeout: 30000 }
  );

  console.log("ECR login successful");
}

async function pushImageToEcr(service, localImageName) {
  const imageUri = getEcrImageUri(service);

  await loginToEcr();

  console.log(`Tagging ${localImageName} as ${imageUri}`);

  await runCommand("docker", ["tag", localImageName, imageUri], {
    timeout: 30000,
  });

  console.log("Pushing image to ECR (this may take a minute)");

  await runCommand("docker", ["push", imageUri], {
    timeout: 300000,
  });

  console.log("Image pushed successfully");

  return imageUri;
}

module.exports = {
  getEcrRegistryUrl,
  getEcrImageTag,
  getEcrImageUri,
  loginToEcr,
  pushImageToEcr,
};
