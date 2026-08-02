// Single source of truth for service statuses.
//
// ALL_STATUSES: every status a service may legally hold.
// TRANSITIONAL_STATUSES: statuses meaning "a deployment is in progress
// right now" — used by the recovery sweep to detect interrupted work.
//
// Keep TRANSITIONAL_STATUSES in sync with the frontend copy in
// frontend/src/components/DeploymentStatus.jsx (browser code cannot
// require backend modules).
const ALL_STATUSES = ["created", "building", "pushed", "deployed", "failed"];
const TRANSITIONAL_STATUSES = ["building", "pushed"];

module.exports = { ALL_STATUSES, TRANSITIONAL_STATUSES };