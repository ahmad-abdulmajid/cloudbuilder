require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const app = require("./app");
const recoverInterruptedDeployments = require("./utils/recoverInterruptedDeployments");

const PORT = 5000;

recoverInterruptedDeployments();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});