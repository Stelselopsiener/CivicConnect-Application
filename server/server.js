require("dotenv").config();
const express = require("express");
const cors = require("cors");
const requestRoutes = require("./routes/requestRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/requests", requestRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`THe server is running on port {PORT}`);
});
