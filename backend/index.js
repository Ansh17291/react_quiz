const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 8080;

app.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
