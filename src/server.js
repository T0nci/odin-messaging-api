const app = require("./app");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Message App API now listening on port ${PORT}!`),
);
