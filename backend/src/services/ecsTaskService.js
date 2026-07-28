const { RegisterTaskDefinitionCommand } = require("@aws-sdk/client-ecs");
const { ecsClient, awsSettings } = require("../config/aws");

/**
 * Registers a new ECS task definition revision for a given service.
 *
 * Each service gets its own family (cloudbuilder-service-<id>) so that
 * revisions of different services never collide. Registering is free and
 * starts nothing — it only stores a blueprint.
 *
 * @param {Object} service
 * @param {string} service.id        unique service id
 * @param {string} service.imageUri  full ECR image URI including tag
 * @param {number} service.port      port the container listens on
 * @param {Array<{name: string, value: string}>} [service.env]
 * @returns {Promise<string>} ARN of the newly registered revision
 */
async function registerTaskDefinition(service) {
  const family = `cloudbuilder-service-${service.id}`;
  const containerName = `cloudbuilder-container-${service.id}`;

  const command = new RegisterTaskDefinitionCommand({
    family,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: "256",
    memory: "512",
    executionRoleArn: awsSettings.executionRoleArn,
    containerDefinitions: [
      {
        name: containerName,
        image: service.imageUri,
        essential: true,
        portMappings: [
          {
            containerPort: service.port,
            hostPort: service.port,
            protocol: "tcp",
          },
        ],
        environment: service.env || [],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": awsSettings.logGroupName,
            "awslogs-region": awsSettings.region,
            "awslogs-stream-prefix": family,
          },
        },
      },
    ],
  });

  const response = await ecsClient.send(command);
  return response.taskDefinition.taskDefinitionArn;
}

module.exports = { registerTaskDefinition };
