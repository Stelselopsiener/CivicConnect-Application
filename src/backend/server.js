require("dotenv").config();
const express = require("express");
const cors = require("cors");
const requestRoutes = require("./api/requestRoutes");
const userRoutes = require("./api/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/users", userRoutes);

const PORT = process.env.PORT || 3000;

// Only listen if the file is run directly (not when imported by Jest)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}`);
  });
}

module.exports = app;
