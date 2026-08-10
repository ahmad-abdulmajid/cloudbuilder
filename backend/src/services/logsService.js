const {
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");
const { logsClient, awsSettings } = require("../config/aws");

/**
 * Fetches recent log events for a service from CloudWatch Logs.
 *
 * Streams are named <family>/<container>/<taskId>, so all streams for
 * one service share the prefix cloudbuilder-service-<id>/. The API
 * cannot sort by LastEventTime while filtering by prefix, so we sort
 * client-side and read the tail of the newest stream.
 *
 * @param {string} serviceId
 * @param {number} [limit] max events to return (default 100)
 * @returns {Promise<{streamName: string|null, events: Array}>}
 */
async function getServiceLogs(serviceId, limit = 100) {
  const streamsResponse = await logsClient.send(
    new DescribeLogStreamsCommand({
      logGroupName: awsSettings.logGroupName,
      logStreamNamePrefix: `cloudbuilder-service-${serviceId}/`,
    })
  );

  const sorted = (streamsResponse.logStreams || [])
    .filter((s) => s.lastEventTimestamp)
    .sort((a, b) => b.lastEventTimestamp - a.lastEventTimestamp);

  if (sorted.length === 0) {
    return { streamName: null, events: [] };
  }

  const eventsResponse = await logsClient.send(
    new GetLogEventsCommand({
      logGroupName: awsSettings.logGroupName,
      logStreamName: sorted[0].logStreamName,
      limit,
      startFromHead: false,
    })
  );

  const events = (eventsResponse.events || []).map((e) => ({
    timestamp: e.timestamp,
    message: e.message,
  }));

  return { streamName: sorted[0].logStreamName, events };
}

module.exports = { getServiceLogs };